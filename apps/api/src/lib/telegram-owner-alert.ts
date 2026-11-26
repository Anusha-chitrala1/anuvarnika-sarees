import { formatRupees } from '@anuvarnika/shared';
import type { Env } from '../types.js';

export interface TelegramOrderItemSummary {
  title: string;
  colorName: string;
  quantity: number;
}

export interface TelegramPaymentAlertDetails {
  orderId: string;
  orderNumber: string;
  totalPaise: number;
  utrReference: string;
  customerName: string;
  customerPhone: string;
  items: TelegramOrderItemSummary[];
}

export function escapeTelegramHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function buildOwnerVerifyDeepLink(env: Env, orderId: string): string {
  const baseUrl = (
    env.APP_BASE_URL?.trim() ||
    env.FRONTEND_URL?.trim() ||
    'https://anuvarnikasarees.pages.dev'
  ).replace(/\/+$/, '');
  return `${baseUrl}/admin/orders/${encodeURIComponent(orderId)}?action=verify`;
}

export function formatTelegramPaymentAlertText(details: TelegramPaymentAlertDetails): string {
  const itemLines =
    details.items.length > 0
      ? details.items
          .map(
            (item) =>
              `• ${escapeTelegramHtml(item.title)} (${escapeTelegramHtml(item.colorName)}) × ${item.quantity}`,
          )
          .join('\n')
      : '• Handcrafted Saree Order';

  return [
    `<b>🔔 New UPI Payment Submitted</b>`,
    ``,
    `<b>Order:</b> #${escapeTelegramHtml(details.orderNumber)}`,
    `<b>Paid Amount:</b> ${escapeTelegramHtml(formatRupees(details.totalPaise))}`,
    `<b>UTR Reference:</b> <code>${escapeTelegramHtml(details.utrReference)}</code>`,
    ``,
    `<b>Saree(s):</b>`,
    itemLines,
    ``,
    `<b>Customer:</b> ${escapeTelegramHtml(details.customerName)} (${escapeTelegramHtml(details.customerPhone)})`,
  ].join('\n');
}

/**
 * Send a Telegram Bot API alert to the store owner with a 1-tap deep link to verify the order.
 * Wrapped in try/catch so a temporary Telegram outage never blocks the customer's UTR submission.
 */
export async function sendOwnerTelegramPaymentAlert(
  env: Env,
  orderDetails: TelegramPaymentAlertDetails,
): Promise<{ sent: boolean; mode: 'telegram' | 'dev-console' | 'error'; deepLink: string }> {
  const deepLink = buildOwnerVerifyDeepLink(env, orderDetails.orderId);
  const botToken = env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = env.TELEGRAM_OWNER_CHAT_ID?.trim();

  if (!botToken || !chatId) {
    console.log(
      `[TelegramOwnerAlert DEV] Order #${orderDetails.orderNumber} | UTR: ${orderDetails.utrReference} | Amount: ${formatRupees(orderDetails.totalPaise)} | DeepLink: ${deepLink}`,
    );
    return { sent: true, mode: 'dev-console', deepLink };
  }

  const text = formatTelegramPaymentAlertText(orderDetails);

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        text,
        reply_markup: {
          inline_keyboard: [[{ text: '✅ Open & Approve Order', url: deepLink }]],
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      console.error('[TelegramOwnerAlert] Telegram sendMessage failed:', response.status, errBody);
      return { sent: false, mode: 'error', deepLink };
    }

    return { sent: true, mode: 'telegram', deepLink };
  } catch (err) {
    console.error('[TelegramOwnerAlert] Network error sending Telegram alert:', err);
    return { sent: false, mode: 'error', deepLink };
  }
}
