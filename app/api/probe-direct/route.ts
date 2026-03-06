import { type NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const allHeaders: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    allHeaders[key] = value
  })

  const xVercelForwardedFor = request.headers.get('x-vercel-forwarded-for')
  const xRealIp = request.headers.get('x-real-ip')
  const xForwardedFor = request.headers.get('x-forwarded-for')

  const candidateVercelForwarded = xVercelForwardedFor
    ? xVercelForwardedFor.split(',')[0].trim()
    : null
  const candidateRealIp = xRealIp ? xRealIp.trim() : null
  const candidateForwardedFor = xForwardedFor
    ? xForwardedFor.split(',')[0].trim()
    : null

  const resolvedIp =
    candidateVercelForwarded ?? candidateRealIp ?? candidateForwardedFor ?? 'unknown'

  return NextResponse.json({
    all_headers: allHeaders,
    ip_candidates: {
      candidate_vercel_forwarded: candidateVercelForwarded,
      candidate_real_ip: candidateRealIp,
      candidate_forwarded_for: candidateForwardedFor,
    },
    resolved_ip: resolvedIp,
  })
}
