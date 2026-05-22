import type { IOrder } from '@/models/Order'
import type { RestaurantEmailContext } from '@/lib/email/restaurant-context'
import { formatPickupPrepareWindow } from '@/lib/email/constants'

// ── Shared helpers ────────────────────────────────────────────────────────────

function fmt(amount: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount)
}

function fmtDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Australia/Melbourne',
  }).format(new Date(date))
}

function pickupLabel(order: IOrder): string {
  if (order.pickupType === 'scheduled' && order.requestedPickupTime) {
    return new Date(order.requestedPickupTime).toLocaleString('en-AU', {
      timeZone: 'Australia/Melbourne',
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    })
  }
  if (order.estimatedPickupTime) {
    return `ASAP — est. ${new Date(order.estimatedPickupTime).toLocaleTimeString('en-AU', {
      timeZone: 'Australia/Melbourne',
      hour: 'numeric', minute: '2-digit', hour12: true,
    })}`
  }
  return order.pickupWindowLabel || 'ASAP'
}

function itemsTableHtml(order: IOrder): string {
  const rows = order.items.map(item => `
    <tr>
      <td style="padding:8px 6px;border-bottom:1px solid #f0ece4;font-size:14px;">
        ${item.name}
        ${item.specialInstructions ? `<br/><span style="font-size:12px;color:#888;">Note: ${item.specialInstructions}</span>` : ''}
      </td>
      <td style="padding:8px 6px;border-bottom:1px solid #f0ece4;text-align:center;font-size:14px;">${item.quantity}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #f0ece4;text-align:right;font-size:14px;">${fmt(item.price * item.quantity)}</td>
    </tr>`).join('')

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <thead>
        <tr style="background:#f9f5f0;">
          <th style="padding:8px 6px;text-align:left;font-size:13px;font-weight:600;color:#555;">Item</th>
          <th style="padding:8px 6px;text-align:center;font-size:13px;font-weight:600;color:#555;">Qty</th>
          <th style="padding:8px 6px;text-align:right;font-size:13px;font-weight:600;color:#555;">Price</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
}

function totalsHtml(order: IOrder): string {
  const discount = order.discountAmount > 0
    ? `<tr><td style="padding:3px 0;color:#16a34a;font-size:14px;">Discount${order.couponCode ? ` (${order.couponCode})` : ''}</td><td style="padding:3px 0;text-align:right;color:#16a34a;font-size:14px;">-${fmt(order.discountAmount)}</td></tr>`
    : ''
  const tip = (order.tipAmount ?? 0) > 0
    ? `<tr><td style="padding:3px 0;color:#666;font-size:14px;">Tip</td><td style="padding:3px 0;text-align:right;font-size:14px;">+${fmt(order.tipAmount)}</td></tr>`
    : ''

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
      <tr><td style="padding:3px 0;color:#666;font-size:14px;">Subtotal</td><td style="padding:3px 0;text-align:right;font-size:14px;">${fmt(order.subtotal)}</td></tr>
      ${discount}
      ${tip}
      <tr style="border-top:2px solid #e5e0d8;">
        <td style="padding:8px 0;font-weight:700;font-size:16px;">Total</td>
        <td style="padding:8px 0;text-align:right;font-weight:700;font-size:16px;color:#7c1d1d;">${fmt(order.total)}</td>
      </tr>
    </table>`
}

function logoOrName(ctx: RestaurantEmailContext): string {
  if (ctx.logoUrl) {
    return `<img src="${ctx.logoUrl}" alt="${ctx.restaurantName}" style="max-width:160px;max-height:60px;height:auto;display:block;margin:0 auto 12px;" />`
  }
  return `<p style="color:#fff;font-size:20px;font-weight:700;margin:0 0 4px;">${ctx.restaurantName}</p>`
}

// ── Public API ────────────────────────────────────────────────────────────────

export function buildOrderConfirmationSubject(restaurantName: string, orderNumber: string): string {
  return `Your ${restaurantName} order is confirmed — #${orderNumber}`
}

export function buildOrderConfirmationHtml(order: IOrder, ctx: RestaurantEmailContext): string {
  const prepWindow = formatPickupPrepareWindow(ctx.pickupPrepareMinutes)

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Order Confirmed</title></head>
<body style="margin:0;padding:0;background:#f9f5f0;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr><td style="background:#7c1d1d;padding:28px 32px;text-align:center;">
    ${logoOrName(ctx)}
    <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">Order Confirmed!</h1>
    <p style="color:#f5c6c6;margin:6px 0 0;font-size:14px;">Thank you, ${order.customerName.split(' ')[0]}! Your order is on its way.</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px;">

    <p style="font-size:15px;color:#444;margin:0 0 24px;line-height:1.6;">
      We've received your order and it will be ready for pickup in ${prepWindow}. Please bring your order number when you collect.
    </p>

    <!-- Order number highlight -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f5f0;border-radius:8px;margin-bottom:24px;">
      <tr><td style="padding:16px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;">Order Number</p>
        <p style="margin:6px 0 0;font-size:28px;font-weight:700;color:#7c1d1d;letter-spacing:2px;">${order.orderNumber}</p>
      </td></tr>
    </table>

    <!-- Order details -->
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-bottom:24px;">
      <tr><td style="padding:4px 0;color:#888;width:140px;">Date</td><td style="padding:4px 0;">${fmtDate(order.createdAt)}</td></tr>
      <tr><td style="padding:4px 0;color:#888;">Pickup</td><td style="padding:4px 0;font-weight:600;">${pickupLabel(order)}</td></tr>
      <tr><td style="padding:4px 0;color:#888;">Location</td><td style="padding:4px 0;">${ctx.address}</td></tr>
      <tr><td style="padding:4px 0;color:#888;">Payment</td><td style="padding:4px 0;color:#16a34a;font-weight:600;">✓ Paid</td></tr>
    </table>

    <hr style="border:none;border-top:1px solid #f0ece4;margin:0 0 24px;" />

    <!-- Items -->
    <h2 style="font-size:15px;font-weight:700;color:#333;margin:0 0 12px;">Your Order</h2>
    ${itemsTableHtml(order)}
    ${totalsHtml(order)}

    <!-- What's next -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;background:#fff8e1;border:1px solid #ffe082;border-radius:8px;">
      <tr><td style="padding:16px;font-size:13px;color:#555;line-height:1.6;">
        <strong>📱 What happens next?</strong><br/>
        We'll prepare your order and it will be ready for pickup at the address above.
        Please show this email or your order number when collecting.
      </td></tr>
    </table>

  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f9f5f0;padding:16px 32px;text-align:center;font-size:12px;color:#aaa;">
    This is an automated message from ${ctx.restaurantName} · ${ctx.address}
  </td></tr>

</table>
</td></tr></table>
</body></html>`
}

export function buildOrderConfirmationText(order: IOrder, ctx: RestaurantEmailContext): string {
  const prepWindow = formatPickupPrepareWindow(ctx.pickupPrepareMinutes)
  const lines = [
    `ORDER CONFIRMED — ${ctx.restaurantName}`,
    '='.repeat(44),
    `Thank you, ${order.customerName}!`,
    '',
    `Order Number : ${order.orderNumber}`,
    `Date         : ${fmtDate(order.createdAt)}`,
    `Pickup       : ${pickupLabel(order)}`,
    `Location     : ${ctx.address}`,
    `Payment      : PAID`,
    `Ready in     : ${prepWindow}`,
    '',
    'ITEMS',
    ...order.items.map(i =>
      `  ${i.name} x${i.quantity}  ${fmt(i.price * i.quantity)}` +
      (i.specialInstructions ? `\n    Note: ${i.specialInstructions}` : '')
    ),
    '',
    `Subtotal : ${fmt(order.subtotal)}`,
    ...(order.discountAmount > 0 ? [`Discount : -${fmt(order.discountAmount)}`] : []),
    ...((order.tipAmount ?? 0) > 0 ? [`Tip      : +${fmt(order.tipAmount)}`] : []),
    `Total    : ${fmt(order.total)}`,
    '',
    'Please bring your order number when collecting.',
    '',
    `— ${ctx.restaurantName}`,
  ]
  return lines.join('\n')
}
