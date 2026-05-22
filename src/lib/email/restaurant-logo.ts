/**
 * Resolve a logo path/URL to an absolute https:// URL suitable for email clients.
 *
 * Rules:
 *  - Already https:// → return as-is
 *  - Relative path (/images/logo.png) → prefix with NEXT_PUBLIC_SITE_URL
 *  - Empty / null → return null (templates hide the <img> tag)
 */
export function resolveEmailLogoUrl(
  logoPathOrUrl: string | null | undefined,
  siteOrigin?: string
): string | null {
  if (!logoPathOrUrl) return null

  // Already absolute https
  if (logoPathOrUrl.startsWith('https://') || logoPathOrUrl.startsWith('http://')) {
    return logoPathOrUrl
  }

  // Relative path — need an absolute origin
  const base =
    siteOrigin ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXTAUTH_URL ??
    ''

  if (!base) return null

  const origin = base.replace(/\/$/, '')
  const path = logoPathOrUrl.startsWith('/') ? logoPathOrUrl : `/${logoPathOrUrl}`
  return `${origin}${path}`
}
