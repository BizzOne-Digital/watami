/**
 * lib/mailgun.ts
 *
 * Low-level Mailgun client + From-header resolver.
 * Never imported by client code — server-only.
 */
import Mailgun from 'mailgun.js'
import FormData from 'form-data'
import { RESTAURANT_DISPLAY_NAME } from './email/constants'

export interface MailgunSendParams {
  to: string | string[]
  subject: string
  html: string
  text?: string
  cc?: string
  bcc?: string
  replyTo?: string
}

// ── Config checks ─────────────────────────────────────────────────────────────

export function isMailgunConfigured(): boolean {
  return !!(
    process.env.MAILGUN_API_KEY &&
    process.env.MAILGUN_DOMAIN &&
    (process.env.MAILGUN_FROM || process.env.MAILGUN_FROM_EMAIL)
  )
}

/**
 * Build RFC 5322 From header.
 * Priority: MAILGUN_FROM (full "Name <addr>") → MAILGUN_FROM_NAME + MAILGUN_FROM_EMAIL → restaurantName + MAILGUN_FROM_EMAIL
 */
export function resolveMailgunFromHeader(): string {
  if (process.env.MAILGUN_FROM) return process.env.MAILGUN_FROM

  const email = process.env.MAILGUN_FROM_EMAIL
  if (!email) return `${RESTAURANT_DISPLAY_NAME} <orders@example.com>`

  const name =
    process.env.MAILGUN_FROM_NAME?.trim() ||
    process.env.NEXT_PUBLIC_SITE_NAME?.trim() ||
    RESTAURANT_DISPLAY_NAME

  return `${name} <${email}>`
}

function getClient() {
  const apiKey = process.env.MAILGUN_API_KEY
  const domain = process.env.MAILGUN_DOMAIN
  if (!apiKey || !domain) return null
  const mg = new Mailgun(FormData)
  return { client: mg.client({ username: 'api', key: apiKey }), domain }
}

/**
 * Send a single email via Mailgun.
 * Throws on Mailgun API error — callers must catch.
 */
export async function sendMailgunEmail(params: MailgunSendParams): Promise<void> {
  const conn = getClient()
  if (!conn) throw new Error('[Mailgun] Not configured — MAILGUN_API_KEY or MAILGUN_DOMAIN missing')

  const { client, domain } = conn
  const from = resolveMailgunFromHeader()

  const msg: Record<string, string | string[]> = {
    from,
    to: Array.isArray(params.to) ? params.to.join(',') : params.to,
    subject: params.subject,
    html: params.html,
  }
  if (params.text) msg.text = params.text
  if (params.cc) msg.cc = params.cc
  if (params.bcc) msg.bcc = params.bcc
  if (params.replyTo) msg['h:Reply-To'] = params.replyTo

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await client.messages.create(domain, msg as any)
}
