/**
 * lib/email/send-order-emails.ts
 *
 * Public API for sending post-payment emails.
 * Idempotent — safe to call from both webhook and verify-session.
 * Never throws — all errors are logged.
 */
import { connectDB } from '@/lib/db'
import Order from '@/models/Order'
import { isMailgunConfigured, sendMailgunEmail } from '@/lib/mailgun'
import { loadRestaurantEmailContext } from './restaurant-context'
import {
  buildOrderConfirmationSubject,
  buildOrderConfirmationHtml,
  buildOrderConfirmationText,
} from '@/lib/emailTemplates/orderConfirmation'
import {
  buildAdminNewOrderSubject,
  buildAdminNewOrderHtml,
} from '@/lib/emailTemplates/adminNewOrder'

export function isEmailConfigured(): boolean {
  return isMailgunConfigured()
}

interface SendPaidOrderEmailsOptions {
  stripeSessionId?: string
  stripePaymentIntentId?: string
  /** Override site origin for logo URL resolution (e.g. from request headers) */
  siteOrigin?: string
}

/**
 * Send kitchen notification + customer confirmation after payment is confirmed.
 *
 * Idempotency: reads merchantNotificationEmailSent + confirmationEmailSent flags
 * from DB before sending. Sets them after success. Safe to retry.
 */
export async function sendPaidOrderEmails(
  orderOrId: { orderNumber: string } | string,
  opts: SendPaidOrderEmailsOptions = {}
): Promise<void> {
  if (!isMailgunConfigured()) {
    console.log('[email] Mailgun not configured — skipping order emails.')
    return
  }

  const siteOrigin =
    opts.siteOrigin ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXTAUTH_URL ??
    ''

  try {
    await connectDB()

    // Re-fetch fresh from DB to get latest idempotency flags
    const orderNumber =
      typeof orderOrId === 'string' ? orderOrId : orderOrId.orderNumber
    const order = await Order.findOne({ orderNumber })
    if (!order) {
      console.warn(`[email] sendPaidOrderEmails: order ${orderNumber} not found`)
      return
    }

    const merchantDone = order.merchantNotificationEmailSent === true
    const customerDone = order.confirmationEmailSent === true

    if (merchantDone && customerDone) {
      console.log(`[email] Both emails already sent for order ${orderNumber} — skipping.`)
      return
    }

    // Load restaurant branding from DB
    const ctx = await loadRestaurantEmailContext(siteOrigin)

    // Resolve kitchen recipient
    const restaurantTo =
      process.env.RESTAURANT_ORDER_EMAIL ||
      process.env.ADMIN_ORDER_EMAIL ||
      ctx.email

    if (!restaurantTo) {
      console.error(
        '[email] No kitchen email address — set RESTAURANT_ORDER_EMAIL in env or restaurant email in Settings.'
      )
    }

    const bcc = process.env.ADMIN_ORDER_EMAIL || undefined
    const cc = process.env.ORDER_CC_EMAIL || undefined

    // ── 1. Kitchen / merchant email ──────────────────────────────────────────
    if (!merchantDone && restaurantTo) {
      try {
        await sendMailgunEmail({
          to: restaurantTo,
          bcc,
          subject: buildAdminNewOrderSubject(order.orderNumber, order.total, ctx.restaurantName),
          html: buildAdminNewOrderHtml(order, ctx),
        })
        order.merchantNotificationEmailSent = true
        order.merchantNotificationEmailSentAt = new Date()
        await order.save()
        console.log(`[email] Kitchen email sent → ${restaurantTo} (order ${orderNumber})`)
      } catch (err) {
        console.error(`[email] Kitchen email FAILED for order ${orderNumber}:`, err)
        // Don't throw — continue to customer email
      }
    }

    // ── 2. Customer confirmation email ───────────────────────────────────────
    const sendCustomer = process.env.ORDER_SEND_CUSTOMER_CONFIRMATION !== 'false'

    if (!customerDone) {
      if (!sendCustomer) {
        order.confirmationEmailSent = true
        order.confirmationEmailSentAt = new Date()
        order.confirmationEmailStatus = 'skipped'
        await order.save()
        console.log(`[email] Customer email skipped (ORDER_SEND_CUSTOMER_CONFIRMATION=false)`)
        return
      }

      if (!order.customerEmail) {
        console.warn(`[email] No customer email on order ${orderNumber}`)
        return
      }

      try {
        await sendMailgunEmail({
          to: order.customerEmail,
          cc,
          subject: buildOrderConfirmationSubject(ctx.restaurantName, order.orderNumber),
          html: buildOrderConfirmationHtml(order, ctx),
          text: buildOrderConfirmationText(order, ctx),
        })
        order.confirmationEmailSent = true
        order.confirmationEmailSentAt = new Date()
        order.confirmationEmailStatus = 'sent'
        order.confirmationEmailError = undefined
        await order.save()
        console.log(`[email] Customer confirmation sent → ${order.customerEmail} (order ${orderNumber})`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        order.confirmationEmailStatus = 'failed'
        order.confirmationEmailError = msg
        await order.save()
        console.error(`[email] Customer email FAILED for order ${orderNumber}:`, err)
      }
    }
  } catch (err) {
    // Top-level catch — never propagate to payment flow
    console.error('[email] sendPaidOrderEmails unexpected error:', err)
  }
}
