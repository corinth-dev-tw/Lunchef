import type { Env } from '../index';

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
  return {
    type: 'flex',
    altText: `New order ${orderNumber} from ${companyName}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'New Order',
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
            text: `Company: ${companyName}`,
            margin: 'md'
          },
          {
            type: 'text',
            text: `Items: ${itemCount}`,
            margin: 'sm'
          },
          {
            type: 'text',
            text: `Total: $${totalAmount}`,
            margin: 'sm',
            weight: 'bold',
            color: '#00B900'
          },
          {
            type: 'text',
            text: `Pickup: ${pickupTime}`,
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
  const statusColors: Record<string, string> = {
    confirmed: '#00B900',
    preparing: '#FF9500',
    arrived: '#007AFF',
    completed: '#34C759',
    cancelled: '#FF3B30'
  };
  
  return {
    type: 'flex',
    altText: `Order ${orderNumber} status updated to ${status}`,
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
            text: `Status: ${status.toUpperCase()}`,
            margin: 'md',
            weight: 'bold',
            color: statusColors[status] || '#000000'
          },
          {
            type: 'text',
            text: `Restaurant: ${restaurantName}`,
            margin: 'sm'
          }
        ]
      }
    }
  };
}