/**
 * lib/email/send-status-email.ts
 *
 * Sends a status-update email to the customer when an order is marked
 * completed or cancelled by the admin.
 *
 * Idempotent via statusEmailLog — never sends the same status twice.
 * Never throws — all errors are logged.
 */
import type { IOrder } from '@/models/Order'
import { isMailgunConfigured, sendMailgunEmail } from '@/lib/mailgun'
import { loadRestaurantEmailContext } from './restaurant-context'
import {
  buildOrderStatusSubject,
  buildOrderStatusHtml,
  buildOrderStatusText,
  type StatusNotifyKind,
} from '@/lib/emailTemplates/orderStatusUpdate'

const NOTIFY_STATUSES: StatusNotifyKind[] = ['completed', 'cancelled']

export async function sendOrderStatusEmailIfNeeded(
  order: IOrder,
  previousStatus: string
): Promise<void> {
  try {
    const newStatus = order.status as string

    // Only notify on completed / cancelled
    if (!NOTIFY_STATUSES.includes(newStatus as StatusNotifyKind)) return

    // completed requires payment confirmed
    if (newStatus === 'completed' && order.paymentStatus !== 'paid') {
      console.log(`[email] Skipping completed email — order ${order.orderNumber} not paid.`)
      return
    }

    // Status didn't actually change
    if (previousStatus === newStatus) return

    // Mailgun required for status emails
    if (!isMailgunConfigured()) {
      console.log('[email] Mailgun not configured — skipping status email.')
      return
    }

    // Dedupe via statusEmailLog
    const alreadySent = order.statusEmailLog?.some(
      (entry) => entry.status === newStatus && entry.recipient === order.customerEmail
    )
    if (alreadySent) {
      console.log(`[email] Status email for "${newStatus}" already sent to ${order.customerEmail} — skipping.`)
      return
    }

    if (!order.customerEmail) {
      console.warn(`[email] No customer email on order ${order.orderNumber}`)
      return
    }

    const siteOrigin =
      process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? ''
    const ctx = await loadRestaurantEmailContext(siteOrigin)
    const kind = newStatus as StatusNotifyKind

    await sendMailgunEmail({
      to: order.customerEmail,
      subject: buildOrderStatusSubject(kind, order.orderNumber, ctx.restaurantName),
      html: buildOrderStatusHtml(order, kind, ctx),
      text: buildOrderStatusText(order, kind, ctx),
    })

    // Record in log
    if (!order.statusEmailLog) order.statusEmailLog = []
    order.statusEmailLog.push({
      status: newStatus,
      sentAt: new Date(),
      recipient: order.customerEmail,
    })
    await order.save()

    console.log(`[email] Status email "${newStatus}" sent → ${order.customerEmail} (order ${order.orderNumber})`)
  } catch (err) {
    console.error(`[email] sendOrderStatusEmailIfNeeded failed for order ${order.orderNumber}:`, err)
    // Never throw — admin status update must not fail because of email
  }
}
