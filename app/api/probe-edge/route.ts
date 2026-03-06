import { type NextRequest, NextResponse } from 'next/server'
import { resolveClientIp, getErrorMessage } from '@/lib/ip-utils'

export const runtime = 'edge'

async function safeFetch(url: string, headers: Record<string, string>): Promise<unknown> {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  return res.json()
}

export async function GET(request: NextRequest) {
  const clientIp = resolveClientIp(request.headers)

  const vercelHeaders = {
    xForwardedFor: request.headers.get('x-forwarded-for'),
    xRealIp: request.headers.get('x-real-ip'),
    xVercelForwardedFor: request.headers.get('x-vercel-forwarded-for'),
    xVercelIpCity: request.headers.get('x-vercel-ip-city'),
    xVercelIpCountry: request.headers.get('x-vercel-ip-country'),
  }

  const forwardHeaders: Record<string, string> = {
    'x-forwarded-for': request.headers.get('x-forwarded-for') ?? '',
    'x-real-ip': clientIp,
    'x-vercel-forwarded-for': request.headers.get('x-vercel-forwarded-for') ?? '',
    'x-probe-runtime': 'edge',
  }

  const authApiUrl = process.env.AUTH_API_URL
  const echoApiUrl = process.env.ECHO_API_URL

  const [authResult, echoResult] = await Promise.allSettled([
    authApiUrl
      ? safeFetch(`${authApiUrl}/ip-inspect`, forwardHeaders)
      : Promise.reject(new Error('AUTH_API_URL not configured')),
    echoApiUrl
      ? safeFetch(`${echoApiUrl}/inspect`, forwardHeaders)
      : Promise.reject(new Error('ECHO_API_URL not configured')),
  ])

  return NextResponse.json({
    runtime: 'edge',
    client_ip_resolved: clientIp,
    vercel_headers: vercelHeaders,
    auth_api:
      authResult.status === 'fulfilled'
        ? authResult.value
        : { error: getErrorMessage(authResult.reason), unreachable: true },
    echo_api:
      echoResult.status === 'fulfilled'
        ? echoResult.value
        : { error: getErrorMessage(echoResult.reason), unreachable: true },
  })
}
