import { Hono } from 'hono';
import type { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

// Verify LINE webhook signature using Web Crypto API
// https://developers.line.biz/en/reference/messaging-api/#signature-validation
async function verifySignature(
  channelSecret: string,
  body: string,
  signature: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(channelSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return computed === signature;
}

// Deduplicate webhook events using webhookEventId
// LINE may redeliver events; we store processed IDs in KV for 24h
async function isDuplicateEvent(
  cache: KVNamespace,
  eventId: string
): Promise<boolean> {
  const key = `webhook_event:${eventId}`;
  const existing = await cache.get(key);
  if (existing) {
    return true;
  }
  // Mark as processed with 24h TTL
  await cache.put(key, '1', { expirationTtl: 86400 });
  return false;
}

interface LineWebhookEvent {
  type: string;
  timestamp: number;
  webhookEventId: string;
  source: { userId: string };
  message?: { text: string };
}

// LINE webhook endpoint
// Must return 200 OK for all valid requests
app.post('/', async (c) => {
  const signature = c.req.header('x-line-signature') || '';
  const body = await c.req.text();

  // Verify signature
  const isValid = await verifySignature(
    c.env.LINE_CHANNEL_SECRET,
    body,
    signature
  );

  if (!isValid) {
    console.error('Invalid LINE webhook signature');
    return c.json({ error: 'Invalid signature' }, 401);
  }

  try {
    const payload = JSON.parse(body) as { events: LineWebhookEvent[] };
    const events = payload.events || [];

    for (const event of events) {
      // Deduplicate using webhookEventId
      const isDup = await isDuplicateEvent(c.env.CACHE, event.webhookEventId);
      if (isDup) {
        console.log('Skipping duplicate event:', event.webhookEventId);
        continue;
      }

      console.log('LINE event:', {
        type: event.type,
        eventId: event.webhookEventId,
        timestamp: event.timestamp,
        userId: event.source?.userId,
      });

      // Handle follow event (user adds bot as friend)
      if (event.type === 'follow') {
        console.log('New follower:', event.source.userId);
        await c.env.CACHE.put(`line_user:${event.source.userId}`, '1', {
          expirationTtl: 86400 * 365, // 1 year
        });
      }

      // Handle message event
      if (event.type === 'message' && event.message?.text) {
        console.log('Message from', event.source.userId, ':', event.message.text);
        // Bot is push-only for now, no reply needed
      }
    }

    // Always return 200 OK
    return c.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Still return 200 to avoid LINE retrying
    return c.json({ success: true });
  }
});

export default app;
