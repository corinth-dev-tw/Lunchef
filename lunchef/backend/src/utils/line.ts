import type { Env } from '../index';
import { t } from '../i18n';
import { formatTwd } from '../i18n/formatters';

export interface LineMessage {
  type: string;
  [key: string]: any;
}

/** Push one or more messages to a LINE user. Returns true on success. */
export async function sendLineMessage(env: Env, to: string, messages: LineMessage[]): Promise<boolean> {
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ to, messages }),
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

/** Push to multiple LINE users. Errors per-user are swallowed so one bad ID doesn't block others. */
export async function broadcastLineMessage(env: Env, userIds: string[], messages: LineMessage[]): Promise<void> {
  await Promise.all(userIds.map((id) => sendLineMessage(env, id, messages)));
}

// ─── helpers ────────────────────────────────────────────────────────────────

function row(label: string, value: string, valueColor?: string) {
  return {
    type: 'box',
    layout: 'horizontal',
    contents: [
      { type: 'text', text: label, size: 'sm', color: '#888888', flex: 2 },
      {
        type: 'text',
        text: value,
        size: 'sm',
        color: valueColor ?? '#111111',
        flex: 3,
        align: 'end',
        wrap: true,
      },
    ],
  };
}

function separator() {
  return { type: 'separator', margin: 'md' };
}

// ─── Flex Builders ──────────────────────────────────────────────────────────

export interface OrderNotificationParams {
  orderNumber: string;
  companyName: string;
  orderedBy: string;
  totalAmount: number;
  pickupTime: string;
  itemCount: number;
  paymentMethod: string;
}

/**
 * Rich flex bubble sent to restaurant staff when a new order is placed.
 */
export function createOrderNotificationFlex(params: OrderNotificationParams): LineMessage {
  const L = 'zh-TW';
  const { orderNumber, companyName, orderedBy, totalAmount, pickupTime, itemCount, paymentMethod } = params;
  const payLabel = paymentMethod === 'cash' ? t('line.paymentCash', L) : t('line.paymentCard', L);

  return {
    type: 'flex',
    altText: `${t('line.newOrder', L)} ${orderNumber}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#00B900',
        paddingAll: 'lg',
        contents: [
          { type: 'text', text: t('line.newOrder', L), weight: 'bold', size: 'lg', color: '#ffffff' },
          { type: 'text', text: orderNumber, size: 'xs', color: '#ddffd9', margin: 'xs' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'lg',
        spacing: 'sm',
        contents: [
          row(t('line.company', L), companyName),
          row(t('line.orderedBy', L), orderedBy),
          separator(),
          row(t('line.items', L), `${itemCount} 份`),
          row(t('line.pickup', L), pickupTime),
          row(t('line.paymentMethod', L), payLabel),
          separator(),
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            contents: [
              { type: 'text', text: t('line.total', L), size: 'md', weight: 'bold', color: '#111111', flex: 2 },
              {
                type: 'text',
                text: formatTwd(totalAmount),
                size: 'xl',
                weight: 'bold',
                color: '#00B900',
                flex: 3,
                align: 'end',
              },
            ],
          },
        ],
      },
    },
  };
}

export interface StatusUpdateParams {
  orderNumber: string;
  status: string;
  restaurantName: string;
  pickupTime?: string;
  cancellationReason?: string;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed:  '#00B900',
  preparing:  '#FF9500',
  arrived:    '#007AFF',
  completed:  '#34C759',
  cancelled:  '#FF3B30',
  pending:    '#888888',
};

const STATUS_HEADER_BG: Record<string, string> = {
  confirmed:  '#00B900',
  preparing:  '#FF9500',
  arrived:    '#007AFF',
  completed:  '#34C759',
  cancelled:  '#FF3B30',
  pending:    '#AAAAAA',
};

/**
 * Rich flex bubble sent to the customer when their order status changes.
 */
export function createStatusUpdateFlex(params: StatusUpdateParams): LineMessage {
  const L = 'zh-TW';
  const { orderNumber, status, restaurantName, pickupTime, cancellationReason } = params;
  const statusLabel = (t as any)(`orderStatus.${status}`, L) || status;
  const bgColor = STATUS_HEADER_BG[status] ?? '#888888';
  const textColor = STATUS_COLORS[status] ?? '#111111';

  const bodyRows: any[] = [
    row(t('line.restaurant', L), restaurantName),
    ...(pickupTime ? [row(t('line.pickup', L), pickupTime)] : []),
    ...(status === 'cancelled' && cancellationReason
      ? [separator(), row(t('line.cancellationReason', L), cancellationReason, '#FF3B30')]
      : []),
  ];

  return {
    type: 'flex',
    altText: `${t('line.statusUpdate', L)}：${statusLabel} — ${orderNumber}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: bgColor,
        paddingAll: 'lg',
        contents: [
          { type: 'text', text: t('line.statusUpdate', L), size: 'xs', color: '#ffffff80' },
          {
            type: 'text',
            text: statusLabel,
            weight: 'bold',
            size: 'xl',
            color: '#ffffff',
            margin: 'xs',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'lg',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: orderNumber,
            weight: 'bold',
            size: 'md',
            color: textColor,
          },
          separator(),
          ...bodyRows,
        ],
      },
    },
  };
}

export interface StaffApprovalParams {
  staffName: string;
  approved: boolean;
  restaurantName?: string;
  role?: string;
  dashboardUrl?: string;
}

/**
 * Flex bubble sent to a staff member when their registration request is approved/rejected.
 */
export function createStaffApprovalFlex(params: StaffApprovalParams): LineMessage {
  const L = 'zh-TW';
  const { staffName, approved, restaurantName, role, dashboardUrl } = params;
  const title = approved ? t('line.staffApproved', L) : t('line.staffRejected', L);
  const message = approved ? t('line.staffApprovedMsg', L) : t('line.staffRejectedMsg', L);
  const bgColor = approved ? '#00B900' : '#FF3B30';

  const bodyContents: any[] = [
    { type: 'text', text: staffName, weight: 'bold', size: 'md' },
    { type: 'text', text: message, size: 'sm', color: '#555555', margin: 'sm', wrap: true },
  ];

  if (approved && restaurantName) {
    bodyContents.push(separator());
    bodyContents.push(row(t('line.restaurant', L), restaurantName));
    if (role) {
      const roleLabel = role === 'manager' ? '店長' : '職員';
      bodyContents.push(row(t('line.role', L), roleLabel));
    }
  }

  const footerContents: any[] = approved && dashboardUrl
    ? [{
        type: 'button',
        action: { type: 'uri', label: t('line.viewDashboard', L), uri: dashboardUrl },
        style: 'primary',
        color: '#00B900',
      }]
    : [];

  return {
    type: 'flex',
    altText: title,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: bgColor,
        paddingAll: 'lg',
        contents: [
          { type: 'text', text: title, weight: 'bold', size: 'lg', color: '#ffffff' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'lg',
        spacing: 'sm',
        contents: bodyContents,
      },
      ...(footerContents.length > 0
        ? { footer: { type: 'box', layout: 'vertical', paddingAll: 'lg', contents: footerContents } }
        : {}),
    },
  };
}
