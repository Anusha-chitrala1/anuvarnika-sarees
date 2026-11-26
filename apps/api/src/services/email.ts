import { formatRupees } from '@anuvarnika/shared';
import type { Env } from '../types.js';
import { sendAdminAlertEmail, sendGmailEmail } from '../lib/gmail-mailer.js';

function getSupportEmail(env: Env): string {
  return env.GMAIL_SENDER_EMAIL?.trim() || env.ADMIN_EMAIL?.trim() || 'anuvarnika.sarees@gmail.com';
}

function getFrontendUrl(env: Env): string {
  return (env.FRONTEND_URL?.trim() || 'https://anuvarnika.pages.dev').replace(/\/+$/, '');
}

const EMAIL_WRAPPER = (title: string, bodyContent: string, supportEmail: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF5EB; margin: 0; padding: 24px; color: #2B1E1A; }
    .container { max-width: 600px; margin: 0 auto; background: #FFFDF9; border: 1px solid #EADBCC; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(122, 35, 30, 0.05); }
    .header { background: #7A231E; padding: 28px 24px; text-align: center; color: #FAF5EB; }
    .header h1 { margin: 0; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 26px; letter-spacing: 1.5px; font-weight: 600; text-transform: uppercase; }
    .header p { margin: 6px 0 0 0; font-size: 13px; color: #EADBCC; letter-spacing: 0.5px; }
    .content { padding: 32px 28px; line-height: 1.6; }
    .otp-box { background: #FAF5EB; border: 2px dashed #A8793E; border-radius: 6px; text-align: center; padding: 18px; margin: 24px 0; }
    .otp-code { font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #7A231E; margin: 0; }
    .btn { display: inline-block; background: #7A231E; color: #FAF5EB !important; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 14px; margin-top: 16px; }
    .table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
    .table th { text-align: left; padding: 10px; border-bottom: 2px solid #EADBCC; color: #7A231E; }
    .table td { padding: 10px; border-bottom: 1px solid #F0E6D8; }
    .footer { background: #FAF5EB; padding: 20px; text-align: center; font-size: 12px; color: #6E5A52; border-top: 1px solid #EADBCC; }
    .highlight { color: #A8793E; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>AnuVarnika Sarees</h1>
      <p>Timeless Handcrafted Silks &amp; Heritage Weaves</p>
    </div>
    <div class="content">
      ${bodyContent}
    </div>
    <div class="footer">
      <p>Thank you for cherishing Indian Handloom Heritage.</p>
      <p>AnuVarnika Sarees &bull; Care &amp; Queries: ${supportEmail} &bull; WhatsApp: +91 70136 22760</p>
    </div>
  </div>
</body>
</html>
`;

/**
 * 1. Login / Checkout Email OTP Verification.
 */
export async function sendOtpEmail(
  env: Env,
  recipient: { email: string; name?: string },
  otp: string,
): Promise<{ success: boolean; id?: string }> {
  const supportEmail = getSupportEmail(env);
  const subject = `Your AnuVarnika Verification Code: ${otp}`;
  const html = EMAIL_WRAPPER(
    'Verify Your Account',
    `
    <h2 style="color: #7A231E; margin-top: 0;">Welcome ${recipient.name || 'to AnuVarnika'}</h2>
    <p>Please use the one-time verification code below to verify your email and securely access your shopping bag and orders:</p>

    <div class="otp-box">
      <div class="otp-code">${otp}</div>
      <p style="margin: 8px 0 0 0; font-size: 12px; color: #6E5A52;">Valid for 10 minutes. Do not share this OTP with anyone.</p>
    </div>

    <p style="font-size: 13px; color: #6E5A52;">If you did not request this verification code, you can safely ignore this email.</p>
    `,
    supportEmail,
  );
  const text = [
    `Welcome ${recipient.name || 'to AnuVarnika Sarees'}`,
    '',
    `Your verification code is: ${otp}`,
    'Valid for 10 minutes. Do not share this OTP with anyone.',
    '',
    'If you did not request this code, you can safely ignore this email.',
  ].join('\n');

  try {
    const res = await sendGmailEmail(env, {
      to: recipient.email,
      subject,
      text,
      html,
    });
    return { success: true, id: res.messageId ?? `gmail-otp-${Date.now()}` };
  } catch (error) {
    console.error('Failed to send OTP via Gmail REST API:', error);
    return { success: false };
  }
}

export interface OrderEmailItem {
  productName: string;
  variantName?: string | null;
  quantity: number;
  lineTotalPaise: number;
}

/**
 * 2. Order Created — Awaiting UPI Payment Verification.
 */
export async function sendOrderPlacedEmail(
  env: Env,
  order: any,
  upiId: string,
  items: OrderEmailItem[] = [],
): Promise<{ success: boolean }> {
  const supportEmail = getSupportEmail(env);
  const orderUrl = `${getFrontendUrl(env)}/orders/${order.id}`;
  const subject = `Order Placed: #${order.orderNumber} (${formatRupees(order.totalPaise)} - Awaiting UPI Payment)`;

  const itemsHtml =
    items.length > 0
      ? `
      <table class="table">
        <thead>
          <tr>
            <th>Saree</th>
            <th>Qty</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (item) => `
            <tr>
              <td>${item.productName}${item.variantName ? ` <span style="color: #6E5A52;">(${item.variantName})</span>` : ''}</td>
              <td>${item.quantity}</td>
              <td style="text-align: right;">${formatRupees(item.lineTotalPaise)}</td>
            </tr>`,
            )
            .join('')}
        </tbody>
      </table>`
      : '';

  const html = EMAIL_WRAPPER(
    `Order #${order.orderNumber}`,
    `
    <h2 style="color: #7A231E; margin-top: 0;">Order #${order.orderNumber} Received</h2>
    <p>Dear ${order.shippingName},</p>
    <p>Thank you for choosing AnuVarnika Sarees! We have temporarily reserved your handcrafted saree(s) for <strong>15 minutes</strong> while you complete your direct UPI payment.</p>

    ${itemsHtml}

    <div style="background: #FAF5EB; border-left: 4px solid #7A231E; padding: 14px 18px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px;"><strong>Payable Amount:</strong> <span style="color: #7A231E; font-size: 18px; font-weight: 700;">${formatRupees(order.totalPaise)}</span></p>
      <p style="margin: 6px 0 0 0; font-size: 14px;"><strong>Owner UPI ID:</strong> <span style="font-family: monospace; color: #A8793E; font-weight: 700;">${upiId}</span></p>
    </div>

    <p>Once paid via any UPI app (GPay, PhonePe, Paytm, BHIM), please submit your <strong>12-digit UTR reference number</strong> on your order page so our team can immediately verify and initiate dispatch.</p>
    <p><a href="${orderUrl}" target="_blank" class="btn">Submit UPI UTR / View Order</a></p>

    <p><strong>Shipping Address:</strong><br>
    ${order.shippingAddressLine1}, ${order.shippingCity}, ${order.shippingState} - ${order.shippingPincode}<br>
    Phone: ${order.shippingPhone}</p>
    `,
    supportEmail,
  );

  const itemsText =
    items.length > 0
      ? `\nItems:\n${items
          .map(
            (i) =>
              `- ${i.productName}${i.variantName ? ` (${i.variantName})` : ''} x${i.quantity}: ${formatRupees(i.lineTotalPaise)}`,
          )
          .join('\n')}\n`
      : '';

  const text = [
    `Order #${order.orderNumber} Received`,
    `Dear ${order.shippingName},`,
    '',
    'Your handcrafted saree(s) are reserved for 15 minutes while you complete direct UPI payment.',
    itemsText,
    `Payable Amount: ${formatRupees(order.totalPaise)}`,
    `Owner UPI ID: ${upiId}`,
    '',
    `Submit your 12-digit UTR reference on your order page: ${orderUrl}`,
    `Shipping Address: ${order.shippingAddressLine1}, ${order.shippingCity}, ${order.shippingState} - ${order.shippingPincode} (Phone: ${order.shippingPhone})`,
  ].join('\n');

  try {
    await sendGmailEmail(env, {
      to: order.shippingEmail,
      subject,
      text,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send Order Placed email:', error);
    return { success: false };
  }
}

/**
 * Instant Admin Alert on UPI UTR Submission (uses Workers `send_email` binding if configured, else Gmail REST API).
 */
export async function sendAdminPaymentAlertEmail(
  env: Env,
  adminEmail: string,
  order: any,
  payment: any,
): Promise<{ success: boolean }> {
  const supportEmail = getSupportEmail(env);
  const subject = `Payment Reference Submitted: Order #${order.orderNumber} (UTR: ${payment.utrReference})`;
  const html = EMAIL_WRAPPER(
    'New Payment Verification Required',
    `
    <h2 style="color: #7A231E; margin-top: 0;">Payment Reference Submitted</h2>
    <p>A customer has submitted a UPI payment reference for manual approval:</p>

    <table class="table">
      <tr><td><strong>Order Number:</strong></td><td>#${order.orderNumber}</td></tr>
      <tr><td><strong>Customer Name:</strong></td><td>${order.shippingName} (${order.shippingPhone})</td></tr>
      <tr><td><strong>Order Amount:</strong></td><td><strong style="color: #7A231E;">${formatRupees(order.totalPaise)}</strong></td></tr>
      <tr><td><strong>Submitted UTR:</strong></td><td><code style="font-size: 16px; color: #A8793E;">${payment.utrReference}</code></td></tr>
      <tr><td><strong>UPI ID Used:</strong></td><td>${payment.upiIdUsed}</td></tr>
    </table>

    <p>Please check your bank statement for credit of <strong>${formatRupees(order.totalPaise)}</strong> and approve the order in the Admin Dashboard.</p>
    `,
    supportEmail,
  );
  const text = [
    `Payment Reference Submitted: Order #${order.orderNumber}`,
    `Customer: ${order.shippingName} (${order.shippingPhone})`,
    `Order Amount: ${formatRupees(order.totalPaise)}`,
    `Submitted UTR: ${payment.utrReference}`,
    `UPI ID Used: ${payment.upiIdUsed}`,
    'Please verify credit in your bank statement and approve or reject in the Admin Dashboard.',
  ].join('\n');

  try {
    await sendAdminAlertEmail(env, {
      to: adminEmail,
      subject,
      text,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send Admin Payment alert email:', error);
    return { success: false };
  }
}

/**
 * 3. Payment Approved & Order Confirmed.
 */
export async function sendPaymentApprovedEmail(
  env: Env,
  order: any,
): Promise<{ success: boolean }> {
  const supportEmail = getSupportEmail(env);
  const orderUrl = `${getFrontendUrl(env)}/orders/${order.id}`;
  const subject = `Payment Confirmed: Order #${order.orderNumber} (${formatRupees(order.totalPaise)})`;
  const html = EMAIL_WRAPPER(
    'Payment Approved',
    `
    <h2 style="color: #7A231E; margin-top: 0;">Payment Verified!</h2>
    <p>Dear ${order.shippingName},</p>
    <p>We are delighted to confirm that your UPI payment of <strong>${formatRupees(order.totalPaise)}</strong> for Order <strong>#${order.orderNumber}</strong> has been verified successfully.</p>

    <p>Your saree is now moving to our handloom finishing and quality check desk. We will notify you with your <strong>Delhivery tracking details</strong> as soon as your parcel is dispatched.</p>
    <p><a href="${orderUrl}" target="_blank" class="btn">View Order Status</a></p>
    `,
    supportEmail,
  );
  const text = [
    `Payment Verified! Order #${order.orderNumber}`,
    `Dear ${order.shippingName},`,
    '',
    `Your UPI payment of ${formatRupees(order.totalPaise)} for Order #${order.orderNumber} has been verified.`,
    'Your saree is now moving to our handloom finishing and quality check desk. We will email your tracking details once dispatched.',
    `View Order: ${orderUrl}`,
  ].join('\n');

  try {
    await sendGmailEmail(env, {
      to: order.shippingEmail,
      subject,
      text,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send Payment Approved email:', error);
    return { success: false };
  }
}

/**
 * 4. Payment Rejected / Action Needed.
 */
export async function sendPaymentRejectedEmail(
  env: Env,
  order: any,
  reason: string,
): Promise<{ success: boolean }> {
  const supportEmail = getSupportEmail(env);
  const orderUrl = `${getFrontendUrl(env)}/orders/${order.id}`;
  const subject = `Action Needed: UPI Payment for Order #${order.orderNumber}`;
  const cleanReason =
    reason.trim() || 'The submitted UPI UTR reference could not be matched with our bank statement.';

  const html = EMAIL_WRAPPER(
    'Payment Verification Action Needed',
    `
    <h2 style="color: #7A231E; margin-top: 0;">Payment Verification Issue</h2>
    <p>Dear ${order.shippingName},</p>
    <p>We could not verify the UPI payment reference submitted for Order <strong>#${order.orderNumber}</strong> (${formatRupees(order.totalPaise)}).</p>

    <div style="background: #FAF5EB; border-left: 4px solid #7A231E; padding: 14px 18px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px;"><strong>Reason from Verification Desk:</strong></p>
      <p style="margin: 6px 0 0 0; font-size: 14px; color: #2B1E1A;">${cleanReason}</p>
    </div>

    <p>If you have completed the payment, please check your UPI app for the exact <strong>12-digit UTR / Reference ID</strong> and resubmit it on your order page, or reach out to us directly on WhatsApp (<strong>+91 70136 22760</strong>) with your payment screenshot.</p>
    <p><a href="${orderUrl}" target="_blank" class="btn">Resubmit UTR on Order Page</a></p>
    `,
    supportEmail,
  );

  const text = [
    `Action Needed: UPI Payment for Order #${order.orderNumber}`,
    `Dear ${order.shippingName},`,
    '',
    `We could not verify the UPI payment reference for Order #${order.orderNumber} (${formatRupees(order.totalPaise)}).`,
    `Reason: ${cleanReason}`,
    '',
    `Please verify your 12-digit UTR in your UPI app and resubmit it here: ${orderUrl}`,
    'Or contact WhatsApp support at +91 70136 22760 with your payment screenshot.',
  ].join('\n');

  try {
    await sendGmailEmail(env, {
      to: order.shippingEmail,
      subject,
      text,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send Payment Rejected email:', error);
    return { success: false };
  }
}

/**
 * 5. Order Shipped via Delhivery.
 */
export async function sendDelhiveryShippedEmail(
  env: Env,
  order: any,
  shipment: any,
): Promise<{ success: boolean }> {
  const supportEmail = getSupportEmail(env);
  const subject = `Shipped via Delhivery: Order #${order.orderNumber} (AWB: ${shipment.awbNumber})`;
  const html = EMAIL_WRAPPER(
    'Your Saree has Shipped',
    `
    <h2 style="color: #7A231E; margin-top: 0;">Your Order is On Its Way!</h2>
    <p>Dear ${order.shippingName},</p>
    <p>Your AnuVarnika parcel has been booked and dispatched via <strong>Delhivery Express</strong>.</p>

    <div style="background: #FAF5EB; border: 1px solid #EADBCC; border-radius: 6px; padding: 18px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px;"><strong>Courier Partner:</strong> Delhivery</p>
      <p style="margin: 6px 0 0 0; font-size: 14px;"><strong>Tracking AWB:</strong> <code style="font-size: 16px; font-weight: 700; color: #7A231E;">${shipment.awbNumber}</code></p>
      <a href="${shipment.trackingUrl}" target="_blank" class="btn">Track on Delhivery</a>
    </div>

    <p>You can also check live delivery updates on our store anytime.</p>
    `,
    supportEmail,
  );
  const text = [
    `Your Order #${order.orderNumber} Has Shipped via Delhivery!`,
    `Dear ${order.shippingName},`,
    '',
    `Courier Partner: Delhivery`,
    `Tracking AWB: ${shipment.awbNumber}`,
    `Track your parcel: ${shipment.trackingUrl}`,
  ].join('\n');

  try {
    await sendGmailEmail(env, {
      to: order.shippingEmail,
      subject,
      text,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send Shipped email:', error);
    return { success: false };
  }
}

/**
 * 6. Order Delivered.
 */
export async function sendOrderDeliveredEmail(
  env: Env,
  order: any,
): Promise<{ success: boolean }> {
  const supportEmail = getSupportEmail(env);
  const orderUrl = `${getFrontendUrl(env)}/orders/${order.id}`;
  const subject = `Delivered: Your AnuVarnika Saree has Arrived! (#${order.orderNumber})`;
  const html = EMAIL_WRAPPER(
    'Order Delivered',
    `
    <h2 style="color: #7A231E; margin-top: 0;">Your Parcel Has Been Delivered!</h2>
    <p>Dear ${order.shippingName},</p>
    <p>According to Delhivery tracking, Order <strong>#${order.orderNumber}</strong> has been successfully delivered. We hope you adore the pure weave and timeless texture of your new saree!</p>

    <p>As a verified buyer, we would be honored if you could leave a short review on our store to share your experience with fellow handloom connoisseurs.</p>
    <p><a href="${orderUrl}" target="_blank" class="btn">Leave a Verified Review</a></p>
    `,
    supportEmail,
  );
  const text = [
    `Your Order #${order.orderNumber} Has Been Delivered!`,
    `Dear ${order.shippingName},`,
    '',
    'We hope you adore the pure weave and timeless texture of your new AnuVarnika saree.',
    `Leave a verified review on your order page: ${orderUrl}`,
  ].join('\n');

  try {
    await sendGmailEmail(env, {
      to: order.shippingEmail,
      subject,
      text,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send Delivered email:', error);
    return { success: false };
  }
}
