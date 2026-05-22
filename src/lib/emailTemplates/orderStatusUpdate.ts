import type { IOrder } from '@/models/Order'
import type { RestaurantEmailContext } from '@/lib/email/restaurant-context'

export type StatusNotifyKind = 'completed' | 'cancelled'

function fmt(amount: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount)
}

function logoOrName(ctx: RestaurantEmailContext): string {
  if (ctx.logoUrl) {
    return `<img src="${ctx.logoUrl}" alt="${ctx.restaurantName}" style="max-width:140px;max-height:56px;height:auto;display:block;margin:0 auto 10px;" />`
  }
  return `<p style="color:#fff;font-size:18px;font-weight:700;margin:0 0 4px;">${ctx.restaurantName}</p>`
}

export function buildOrderStatusSubject(
  kind: StatusNotifyKind,
  orderNumber: string,
  restaurantName: string
): string {
  if (kind === 'completed') return `Your order #${orderNumber} is ready for pickup — ${restaurantName}`
  return `Your order #${orderNumber} has been cancelled — ${restaurantName}`
}

export function buildOrderStatusHtml(
  order: IOrder,
  kind: StatusNotifyKind,
  ctx: RestaurantEmailContext
): string {
  const isCompleted = kind === 'completed'
  const headerBg = isCompleted ? '#15803d' : '#b91c1c'
  const emoji = isCompleted ? '✅' : '❌'
  const headline = isCompleted ? 'Your order is ready!' : 'Order cancelled'
  const bodyText = isCompleted
    ? `Great news! Your order <strong>#${order.orderNumber}</strong> is ready for pickup at ${ctx.address}. Please bring your order number.`
    : `Your order <strong>#${order.orderNumber}</strong> has been cancelled. If you have any questions, please contact us.`

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${headline}</title></head>
<body style="margin:0;padding:0;background:#f9f5f0;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

  <tr><td style="background:${headerBg};padding:28px 32px;text-align:center;">
    ${logoOrName(ctx)}
    <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">${emoji} ${headline}</h1>
  </td></tr>

  <tr><td style="padding:32px;">
    <p style="font-size:15px;color:#444;margin:0 0 24px;line-height:1.6;">${bodyText}</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f5f0;border-radius:8px;margin-bottom:24px;">
      <tr><td style="padding:16px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;">Order Number</p>
        <p style="margin:6px 0 0;font-size:26px;font-weight:700;color:#7c1d1d;letter-spacing:2px;">${order.orderNumber}</p>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-bottom:24px;">
      <tr><td style="padding:4px 0;color:#888;width:140px;">Customer</td><td style="padding:4px 0;">${order.customerName}</td></tr>
      <tr><td style="padding:4px 0;color:#888;">Total</td><td style="padding:4px 0;font-weight:600;">${fmt(order.total)}</td></tr>
      ${isCompleted ? `<tr><td style="padding:4px 0;color:#888;">Pickup at</td><td style="padding:4px 0;">${ctx.address}</td></tr>` : ''}
    </table>

    ${ctx.email ? `<p style="font-size:13px;color:#888;margin:0;">Questions? Contact us at <a href="mailto:${ctx.email}" style="color:#7c1d1d;">${ctx.email}</a></p>` : ''}
  </td></tr>

  <tr><td style="background:#f9f5f0;padding:14px 32px;text-align:center;font-size:12px;color:#aaa;">
    This is an automated message from ${ctx.restaurantName} · ${ctx.address}
  </td></tr>

</table>
</td></tr></table>
</body></html>`
}

export function buildOrderStatusText(
  order: IOrder,
  kind: StatusNotifyKind,
  ctx: RestaurantEmailContext
): string {
  const isCompleted = kind === 'completed'
  const lines = [
    isCompleted ? `YOUR ORDER IS READY — ${ctx.restaurantName}` : `ORDER CANCELLED — ${ctx.restaurantName}`,
    '='.repeat(44),
    '',
    isCompleted
      ? `Great news! Your order #${order.orderNumber} is ready for pickup.`
      : `Your order #${order.orderNumber} has been cancelled.`,
    '',
    `Order Number : ${order.orderNumber}`,
    `Customer     : ${order.customerName}`,
    `Total        : ${fmt(order.total)}`,
    ...(isCompleted ? [`Pickup at    : ${ctx.address}`] : []),
    '',
    ...(ctx.email ? [`Questions? Contact us at ${ctx.email}`] : []),
    '',
    `— ${ctx.restaurantName}`,
  ]
  return lines.join('\n')
}
