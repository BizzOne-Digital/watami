import type { IOrder } from '@/models/Order'
import type { RestaurantEmailContext } from '@/lib/email/restaurant-context'

function fmt(amount: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount)
}

function fmtDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Australia/Melbourne',
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
      timeZone: 'Australia/Melbourne', hour: 'numeric', minute: '2-digit', hour12: true,
    })}`
  }
  return order.pickupWindowLabel || 'ASAP'
}

function itemsTableHtml(order: IOrder): string {
  const rows = order.items.map(item => `
    <tr>
      <td style="padding:8px 6px;border-bottom:1px solid #f0ece4;font-size:14px;">
        ${item.name}
        ${item.specialInstructions ? `<br/><span style="font-size:12px;color:#e53e3e;font-weight:600;">⚠ ${item.specialInstructions}</span>` : ''}
      </td>
      <td style="padding:8px 6px;border-bottom:1px solid #f0ece4;text-align:center;font-size:14px;font-weight:700;">${item.quantity}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #f0ece4;text-align:right;font-size:14px;">${fmt(item.price * item.quantity)}</td>
    </tr>`).join('')

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <thead>
        <tr style="background:#f9f5f0;">
          <th style="padding:8px 6px;text-align:left;font-size:13px;font-weight:600;color:#555;">Item</th>
          <th style="padding:8px 6px;text-align:center;font-size:13px;font-weight:600;color:#555;">Qty</th>
          <th style="padding:8px 6px;text-align:right;font-size:13px;font-weight:600;color:#555;">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
}

export function buildAdminNewOrderSubject(
  orderNumber: string,
  total: number,
  restaurantName: string
): string {
  return `🍱 New order #${orderNumber} — ${fmt(total)} — ${restaurantName}`
}

export function buildAdminNewOrderHtml(order: IOrder, ctx: RestaurantEmailContext): string {
  const logoHtml = ctx.logoUrl
    ? `<img src="${ctx.logoUrl}" alt="${ctx.restaurantName}" style="max-width:120px;max-height:48px;height:auto;display:block;margin:0 auto 10px;" />`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>New Order</title></head>
<body style="margin:0;padding:0;background:#f9f5f0;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr><td style="background:#7c1d1d;padding:24px 32px;text-align:center;">
    ${logoHtml}
    <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">🍱 New Order Received</h1>
    <p style="color:#f5c6c6;margin:4px 0 0;font-size:13px;">${ctx.restaurantName}</p>
  </td></tr>

  <!-- Alert banner -->
  <tr><td style="background:#fef3c7;padding:12px 32px;text-align:center;font-size:14px;font-weight:600;color:#92400e;">
    ⏰ Order #${order.orderNumber} — Pickup: ${pickupLabel(order)}
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:28px 32px;">

    <!-- Order meta -->
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-bottom:20px;">
      <tr><td style="padding:4px 0;color:#888;width:160px;">Order Number</td><td style="padding:4px 0;font-weight:700;color:#7c1d1d;">${order.orderNumber}</td></tr>
      <tr><td style="padding:4px 0;color:#888;">Received</td><td style="padding:4px 0;">${fmtDate(order.createdAt)}</td></tr>
      <tr><td style="padding:4px 0;color:#888;">Pickup Type</td><td style="padding:4px 0;">${order.pickupType === 'scheduled' ? '🕐 Scheduled' : '⚡ ASAP'}</td></tr>
      <tr><td style="padding:4px 0;color:#888;">Pickup Time</td><td style="padding:4px 0;font-weight:600;">${pickupLabel(order)}</td></tr>
      <tr><td style="padding:4px 0;color:#888;">Payment</td><td style="padding:4px 0;color:#16a34a;font-weight:600;">✓ PAID</td></tr>
      ${order.paymentIntentId ? `<tr><td style="padding:4px 0;color:#888;">Stripe PI</td><td style="padding:4px 0;font-size:12px;color:#aaa;font-family:monospace;">${order.paymentIntentId}</td></tr>` : ''}
    </table>

    <hr style="border:none;border-top:1px solid #f0ece4;margin:0 0 20px;" />

    <!-- Customer -->
    <h2 style="font-size:14px;font-weight:700;color:#333;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.5px;">Customer</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-bottom:20px;">
      <tr><td style="padding:4px 0;color:#888;width:160px;">Name</td><td style="padding:4px 0;font-weight:600;">${order.customerName}</td></tr>
      <tr><td style="padding:4px 0;color:#888;">Phone</td><td style="padding:4px 0;"><a href="tel:${order.customerPhone}" style="color:#7c1d1d;">${order.customerPhone}</a></td></tr>
      <tr><td style="padding:4px 0;color:#888;">Email</td><td style="padding:4px 0;"><a href="mailto:${order.customerEmail}" style="color:#7c1d1d;">${order.customerEmail}</a></td></tr>
    </table>

    <hr style="border:none;border-top:1px solid #f0ece4;margin:0 0 20px;" />

    <!-- Items -->
    <h2 style="font-size:14px;font-weight:700;color:#333;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.5px;">Order Items</h2>
    ${itemsTableHtml(order)}

    <!-- Totals -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;font-size:14px;">
      <tr><td style="padding:3px 0;color:#888;">Subtotal</td><td style="padding:3px 0;text-align:right;">${fmt(order.subtotal)}</td></tr>
      ${order.discountAmount > 0 ? `<tr><td style="padding:3px 0;color:#16a34a;">Discount${order.couponCode ? ` (${order.couponCode})` : ''}</td><td style="padding:3px 0;text-align:right;color:#16a34a;">-${fmt(order.discountAmount)}</td></tr>` : ''}
      ${(order.tipAmount ?? 0) > 0 ? `<tr><td style="padding:3px 0;color:#888;">Tip</td><td style="padding:3px 0;text-align:right;">+${fmt(order.tipAmount)}</td></tr>` : ''}
      <tr style="border-top:2px solid #e5e0d8;">
        <td style="padding:8px 0;font-weight:700;font-size:16px;">Total</td>
        <td style="padding:8px 0;text-align:right;font-weight:700;font-size:16px;color:#7c1d1d;">${fmt(order.total)}</td>
      </tr>
    </table>

  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f9f5f0;padding:14px 32px;text-align:center;font-size:12px;color:#aaa;">
    ${ctx.restaurantName} · ${ctx.address}
  </td></tr>

</table>
</td></tr></table>
</body></html>`
}
