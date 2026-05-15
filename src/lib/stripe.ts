import Stripe from 'stripe'

let _stripe: Stripe | null = null

function getStripe(): Stripe {
  if (_stripe) return _stripe

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
  }

  _stripe = new Stripe(key, {
    apiVersion: '2025-02-24.acacia',
  })

  return _stripe
}

// Default export as a Proxy so existing `stripe.xxx` call sites work unchanged
const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export default stripe
