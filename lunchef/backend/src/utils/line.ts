import type { Env } from '../index';
import { t } from '../i18n';
import { formatTwd } from '../i18n/formatters';

interface LineMessage {
  type: string;
  [key: string]: any;
}

export async function sendLineMessage(env: Env, to: string, messages: LineMessage[]) {
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to,
        messages
      })
    });

    if (!response.ok) {
      console.error('LINE API error:', await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Send LINE message error:', error);
    return false;
  }
}

export function createOrderNotificationFlex(
  orderNumber: string,
  companyName: string,
  totalAmount: number,
  pickupTime: string,
  itemCount: number
): LineMessage {
  const locale = 'zh-TW';
  return {
    type: 'flex',
    altText: `${t('line.newOrder', locale)} ${orderNumber}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: t('line.newOrder', locale),
            weight: 'bold',
            size: 'xl',
            color: '#ffffff'
          }
        ],
        backgroundColor: '#00B900'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: orderNumber,
            weight: 'bold',
            size: 'lg'
          },
          {
            type: 'text',
            text: `${t('line.company', locale)}：${companyName}`,
            margin: 'md'
          },
          {
            type: 'text',
            text: `${t('line.items', locale)}：${itemCount}`,
            margin: 'sm'
          },
          {
            type: 'text',
            text: `${t('line.total', locale)}：${formatTwd(totalAmount)}`,
            margin: 'sm',
            weight: 'bold',
            color: '#00B900'
          },
          {
            type: 'text',
            text: `${t('line.pickup', locale)}：${pickupTime}`,
            margin: 'sm'
          }
        ]
      }
    }
  };
}

export function createStatusUpdateFlex(
  orderNumber: string,
  status: string,
  restaurantName: string
): LineMessage {
  const locale = 'zh-TW';
  const statusColors: Record<string, string> = {
    confirmed: '#00B900',
    preparing: '#FF9500',
    arrived: '#007AFF',
    completed: '#34C759',
    cancelled: '#FF3B30'
  };

  const statusLabel = t(`orderStatus.${status}` as any, locale) || status;

  return {
    type: 'flex',
    altText: `${t('line.statusUpdate', locale)} ${orderNumber}`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: orderNumber,
            weight: 'bold',
            size: 'lg'
          },
          {
            type: 'text',
            text: `${t('line.status', locale)}：${statusLabel.toUpperCase()}`,
            margin: 'md',
            weight: 'bold',
            color: statusColors[status] || '#000000'
          },
          {
            type: 'text',
            text: `${t('line.restaurant', locale)}：${restaurantName}`,
            margin: 'sm'
          }
        ]
      }
    }
  };
}
