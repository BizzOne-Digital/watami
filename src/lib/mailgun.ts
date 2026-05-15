/**
 * Server-side Mailgun helper — never imported by client code.
 *
 * Exposes:
 *   sendMerchantOrderEmail(order)   → orders@merchantorders.io
 *   sendCustomerConfirmationEmail(order) → customer email on the order
 *
 * Both functions are fire-and-forget safe: they catch all errors internally
 * and never throw, so email failure cannot break checkout or payment.
 */

import Mailgun from 'mailgun.js'
import FormData from 'form-data'
import type { IOrder } from '@/models/Order'

// ── Config ─────────────────────────────────────────────────────────────────

function getMailgunClient() {
  const apiKey = process.env.MAILGUN_API_KEY
  const domain = process.env.MAILGUN_DOMAIN

  if (!apiKey || !domain) {
    console.warn(
      '[Mailgun] MAILGUN_API_KEY or MAILGUN_DOMAIN is not set — emails will not be sent.'
    )
    return null
  }

  const mg = new Mailgun(FormData)
  return mg.client({ username: 'api', key: apiKey })
}

const RESTAURANT_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Watami Japanese Food'
const FROM_EMAIL = process.env.MAILGUN_FROM_EMAIL ?? 'orders@merchantorders.io'
const ORDERS_EMAIL = process.env.MAILGUN_ORDERS_EMAIL ?? 'orders@merchantorders.io'
const LOGO_URL = process.env.RESTAURANT_LOGO_URL ?? ''

// ── Shared helpers ──────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount)
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Australia/Melbourne',
  }).format(date)
}

function itemsTableHtml(order: IOrder): string {
  const rows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 4px;border-bottom:1px solid #f0ece4;">${item.name}${item.specialInstructions ? `<br/><span style="font-size:12px;color:#888;">Note: ${item.specialInstructions}</span>` : ''}</td>
        <td style="padding:8px 4px;border-bottom:1px solid #f0ece4;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 4px;border-bottom:1px solid #f0ece4;text-align:right;">${formatCurrency(item.price)}</td>
        <td style="padding:8px 4px;border-bottom:1px solid #f0ece4;text-align:right;">${formatCurrency(item.price * item.quantity)}</td>
      </tr>`
    )
    .join('')

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="background:#f9f5f0;">
          <th style="padding:8px 4px;text-align:left;font-weight:600;">Item</th>
          <th style="padding:8px 4px;text-align:center;font-weight:600;">Qty</th>
          <th style="padding:8px 4px;text-align:right;font-weight:600;">Unit</th>
          <th style="padding:8px 4px;text-align:right;font-weight:600;">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
}

function itemsPlainText(order: IOrder): string {
  return order.items
    .map(
      (item) =>
        `  - ${item.name} x${item.quantity} @ ${formatCurrency(item.price)} = ${formatCurrency(item.price * item.quantity)}` +
        (item.specialInstructions ? `\n    Note: ${item.specialInstructions}` : '')
    )
    .join('\n')
}

function totalsHtml(order: IOrder): string {
  const discount =
    order.discountAmount > 0
      ? `<tr><td style="padding:4px 0;color:#16a34a;">Discount${order.couponCode ? ` (${order.couponCode})` : ''}</td><td style="padding:4px 0;text-align:right;color:#16a34a;">-${formatCurrency(order.discountAmount)}</td></tr>`
      : ''

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-top:12px;">
      <tr><td style="padding:4px 0;color:#666;">Subtotal</td><td style="padding:4px 0;text-align:right;">${formatCurrency(order.subtotal)}</td></tr>
      ${discount}
      <tr style="font-weight:700;font-size:16px;border-top:2px solid #e5e0d8;">
        <td style="padding:8px 0;">Total</td>
        <td style="padding:8px 0;text-align:right;color:#7c1d1d;">${formatCurrency(order.total)}</td>
      </tr>
    </table>`
}

function totalsPlainText(order: IOrder): string {
  const lines = [`Subtotal: ${formatCurrency(order.subtotal)}`]
  if (order.discountAmount > 0) {
    lines.push(
      `Discount${order.couponCode ? ` (${order.couponCode})` : ''}: -${formatCurrency(order.discountAmount)}`
    )
  }
  lines.push(`Total: ${formatCurrency(order.total)}`)
  return lines.join('\n')
}

// ── Merchant email ──────────────────────────────────────────────────────────

function buildMerchantHtml(order: IOrder): string {
  const pickupInfo = order.pickupOnly
    ? 'Pickup — Shop 5/672 Glenferrie Rd, Hawthorn VIC 3122'
    : 'N/A'

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f5f0;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#7c1d1d;padding:24px 32px;text-align:center;">
      ${LOGO_URL ? `<img src="${LOGO_URL}" alt="${RESTAURANT_NAME} logo" style="max-width:160px;height:auto;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;" />` : ''}
      <h1 style="color:#fff;margin:0;font-size:22px;">New Order Received</h1>
      <p style="color:#f5c6c6;margin:4px 0 0;">${RESTAURANT_NAME}</p>
    </div>

    <div style="padding:32px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-bottom:24px;">
        <tr><td style="padding:4px 0;color:#666;width:160px;">Order Number</td><td style="padding:4px 0;font-weight:700;color:#7c1d1d;">${order.orderNumber}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Order Date</td><td style="padding:4px 0;">${formatDate(order.createdAt)}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Payment Status</td><td style="padding:4px 0;font-weight:600;color:#16a34a;">${order.paymentStatus?.toUpperCase() ?? 'PAID'}</td></tr>
        ${order.paymentIntentId ? `<tr><td style="padding:4px 0;color:#666;">Payment ID</td><td style="padding:4px 0;font-size:12px;color:#888;">${order.paymentIntentId}</td></tr>` : ''}
        <tr><td style="padding:4px 0;color:#666;">Order Type</td><td style="padding:4px 0;">${pickupInfo}</td></tr>
      </table>

      <hr style="border:none;border-top:1px solid #f0ece4;margin:0 0 24px;" />

      <h2 style="font-size:16px;margin:0 0 12px;color:#333;">Customer Details</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-bottom:24px;">
        <tr><td style="padding:4px 0;color:#666;width:160px;">Name</td><td style="padding:4px 0;">${order.customerName}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Email</td><td style="padding:4px 0;">${order.customerEmail}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Phone</td><td style="padding:4px 0;">${order.customerPhone}</td></tr>
      </table>

      <hr style="border:none;border-top:1px solid #f0ece4;margin:0 0 24px;" />

      <h2 style="font-size:16px;margin:0 0 12px;color:#333;">Order Items</h2>
      ${itemsTableHtml(order)}
      ${totalsHtml(order)}
    </div>

    <div style="background:#f9f5f0;padding:16px 32px;text-align:center;font-size:12px;color:#999;">
      ${RESTAURANT_NAME} · Shop 5/672 Glenferrie Rd, Hawthorn VIC 3122
    </div>
  </div>
</body>
</html>`
}

function buildMerchantText(order: IOrder): string {
  const lines = [
    `NEW ORDER — ${RESTAURANT_NAME}`,
    `${'='.repeat(40)}`,
    `Order Number : ${order.orderNumber}`,
    `Order Date   : ${formatDate(order.createdAt)}`,
    `Payment      : ${order.paymentStatus?.toUpperCase() ?? 'PAID'}`,
    order.paymentIntentId ? `Payment ID   : ${order.paymentIntentId}` : '',
    `Order Type   : ${order.pickupOnly ? 'Pickup' : 'N/A'}`,
    ``,
    `CUSTOMER`,
    `Name  : ${order.customerName}`,
    `Email : ${order.customerEmail}`,
    `Phone : ${order.customerPhone}`,
    ``,
    `ITEMS`,
    itemsPlainText(order),
    ``,
    totalsPlainText(order),
    ``,
    `${RESTAURANT_NAME} · Shop 5/672 Glenferrie Rd, Hawthorn VIC 3122`,
  ]
  return lines.filter((l) => l !== null).join('\n')
}

// ── Customer confirmation email ─────────────────────────────────────────────

function buildCustomerHtml(order: IOrder): string {
  const pickupInfo = order.pickupOnly
    ? 'Shop 5/672 Glenferrie Rd, Hawthorn VIC 3122'
    : 'N/A'

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f5f0;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#7c1d1d;padding:24px 32px;text-align:center;">
      ${LOGO_URL ? `<img src="${LOGO_URL}" alt="${RESTAURANT_NAME} logo" style="max-width:160px;height:auto;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;" />` : ''}
      <h1 style="color:#fff;margin:0;font-size:22px;">Order Confirmed!</h1>
      <p style="color:#f5c6c6;margin:4px 0 0;">Thank you for your order, ${order.customerName.split(' ')[0]}!</p>
    </div>

    <div style="padding:32px;">
      <p style="font-size:15px;color:#444;margin:0 0 24px;">
        We've received your order and it will be ready for pickup soon. Please bring your order number when you collect.
      </p>

      <div style="background:#f9f5f0;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#666;">Order Number</p>
        <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:#7c1d1d;letter-spacing:1px;">${order.orderNumber}</p>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-bottom:24px;">
        <tr><td style="padding:4px 0;color:#666;width:160px;">Order Date</td><td style="padding:4px 0;">${formatDate(order.createdAt)}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Payment</td><td style="padding:4px 0;font-weight:600;color:#16a34a;">${order.paymentStatus?.toUpperCase() ?? 'PAID'}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Pickup At</td><td style="padding:4px 0;">${pickupInfo}</td></tr>
      </table>

      <hr style="border:none;border-top:1px solid #f0ece4;margin:0 0 24px;" />

      <h2 style="font-size:16px;margin:0 0 12px;color:#333;">Your Order</h2>
      ${itemsTableHtml(order)}
      ${totalsHtml(order)}

      <div style="margin-top:24px;background:#fff8e1;border:1px solid #ffe082;border-radius:8px;padding:16px;font-size:13px;color:#555;">
        <strong>📱 What happens next?</strong><br/>
        We'll prepare your order and it will be ready for pickup at the address above. Please show this email or your order number when collecting.
      </div>
    </div>

    <div style="background:#f9f5f0;padding:16px 32px;text-align:center;font-size:12px;color:#999;">
      ${RESTAURANT_NAME} · Shop 5/672 Glenferrie Rd, Hawthorn VIC 3122
    </div>
  </div>
</body>
</html>`
}

function buildCustomerText(order: IOrder): string {
  const lines = [
    `ORDER CONFIRMED — ${RESTAURANT_NAME}`,
    `${'='.repeat(40)}`,
    `Thank you for your order, ${order.customerName}!`,
    ``,
    `Order Number : ${order.orderNumber}`,
    `Order Date   : ${formatDate(order.createdAt)}`,
    `Payment      : ${order.paymentStatus?.toUpperCase() ?? 'PAID'}`,
    `Pickup At    : ${order.pickupOnly ? 'Shop 5/672 Glenferrie Rd, Hawthorn VIC 3122' : 'N/A'}`,
    ``,
    `ITEMS`,
    itemsPlainText(order),
    ``,
    totalsPlainText(order),
    ``,
    `Please bring your order number when collecting.`,
    ``,
    `${RESTAURANT_NAME} · Shop 5/672 Glenferrie Rd, Hawthorn VIC 3122`,
  ]
  return lines.join('\n')
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Send order notification to the merchant/platform inbox.
 * Never throws — logs errors and returns silently.
 */
export async function sendMerchantOrderEmail(order: IOrder): Promise<void> {
  const client = getMailgunClient()
  if (!client) return

  const domain = process.env.MAILGUN_DOMAIN!
  const to = ORDERS_EMAIL

  try {
    await client.messages.create(domain, {
      from: `${RESTAURANT_NAME} Orders <${FROM_EMAIL}>`,
      to,
      subject: `New order received - ${RESTAURANT_NAME} - Order #${order.orderNumber}`,
      html: buildMerchantHtml(order),
      text: buildMerchantText(order),
    })
    console.log(`[Mailgun] Merchant order email sent → ${to} (order ${order.orderNumber})`)
  } catch (err) {
    console.error(`[Mailgun] Failed to send merchant email for order ${order.orderNumber}:`, err)
  }
}

/**
 * Send order confirmation to the customer.
 * Never throws — logs errors and returns silently.
 */
export async function sendCustomerConfirmationEmail(order: IOrder): Promise<void> {
  const client = getMailgunClient()
  if (!client) return

  if (!order.customerEmail) {
    console.warn(`[Mailgun] No customer email on order ${order.orderNumber} — skipping customer email.`)
    return
  }

  const domain = process.env.MAILGUN_DOMAIN!
  const to = order.customerEmail

  try {
    await client.messages.create(domain, {
      from: `${RESTAURANT_NAME} <${FROM_EMAIL}>`,
      to,
      subject: `Your ${RESTAURANT_NAME} order confirmation - Order #${order.orderNumber}`,
      html: buildCustomerHtml(order),
      text: buildCustomerText(order),
    })
    console.log(`[Mailgun] Customer confirmation email sent → ${to} (order ${order.orderNumber})`)
  } catch (err) {
    console.error(`[Mailgun] Failed to send customer email for order ${order.orderNumber}:`, err)
  }
}
