/**
 * Extracts the first non-empty IP from a comma-separated header value.
 */
export function firstIp(val: string | null): string | null {
  const part = val?.split(',')[0].trim() ?? ''
  return part || null
}

/**
 * Resolves the best client IP from a set of Vercel-injected headers.
 * Priority: x-vercel-forwarded-for > x-real-ip > x-forwarded-for > 'unknown'
 */
export function resolveClientIp(headers: {
  get(name: string): string | null
}): string {
  return (
    firstIp(headers.get('x-vercel-forwarded-for')) ??
    (headers.get('x-real-ip')?.trim() || null) ??
    firstIp(headers.get('x-forwarded-for')) ??
    'unknown'
  )
}

/**
 * Extracts a string message from an unknown error value.
 */
export function getErrorMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message
  if (typeof reason === 'string') return reason
  return 'fetch failed'
}
