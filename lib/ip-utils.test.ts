import { describe, it, expect } from 'vitest'
import { firstIp, resolveClientIp, getErrorMessage } from './ip-utils'

// Minimal headers mock
function makeHeaders(entries: Record<string, string | null>) {
  return {
    get: (name: string) => entries[name] ?? null,
  }
}

describe('firstIp', () => {
  it('returns the first IP from a comma-separated list', () => {
    expect(firstIp('1.2.3.4, 5.6.7.8')).toBe('1.2.3.4')
  })

  it('returns the value when there is only one IP', () => {
    expect(firstIp('1.2.3.4')).toBe('1.2.3.4')
  })

  it('trims whitespace around the IP', () => {
    expect(firstIp('  1.2.3.4  , 5.6.7.8')).toBe('1.2.3.4')
  })

  it('returns null for null input', () => {
    expect(firstIp(null)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(firstIp('')).toBeNull()
  })

  it('returns null when first element is only whitespace', () => {
    expect(firstIp('  , 1.2.3.4')).toBeNull()
  })
})

describe('resolveClientIp', () => {
  it('prefers x-vercel-forwarded-for over all others', () => {
    const headers = makeHeaders({
      'x-vercel-forwarded-for': '1.1.1.1',
      'x-real-ip': '2.2.2.2',
      'x-forwarded-for': '3.3.3.3',
    })
    expect(resolveClientIp(headers)).toBe('1.1.1.1')
  })

  it('falls back to x-real-ip when x-vercel-forwarded-for is absent', () => {
    const headers = makeHeaders({
      'x-vercel-forwarded-for': null,
      'x-real-ip': '2.2.2.2',
      'x-forwarded-for': '3.3.3.3',
    })
    expect(resolveClientIp(headers)).toBe('2.2.2.2')
  })

  it('falls back to first x-forwarded-for when x-real-ip is absent', () => {
    const headers = makeHeaders({
      'x-vercel-forwarded-for': null,
      'x-real-ip': null,
      'x-forwarded-for': '3.3.3.3, 4.4.4.4',
    })
    expect(resolveClientIp(headers)).toBe('3.3.3.3')
  })

  it('returns "unknown" when all IP headers are absent', () => {
    const headers = makeHeaders({
      'x-vercel-forwarded-for': null,
      'x-real-ip': null,
      'x-forwarded-for': null,
    })
    expect(resolveClientIp(headers)).toBe('unknown')
  })

  it('skips empty x-vercel-forwarded-for and falls back', () => {
    const headers = makeHeaders({
      'x-vercel-forwarded-for': '  , 1.2.3.4',
      'x-real-ip': '2.2.2.2',
      'x-forwarded-for': null,
    })
    // empty first element → falls back to x-real-ip
    expect(resolveClientIp(headers)).toBe('2.2.2.2')
  })

  it('extracts first IP from comma-separated x-vercel-forwarded-for', () => {
    const headers = makeHeaders({
      'x-vercel-forwarded-for': '5.5.5.5, 6.6.6.6',
      'x-real-ip': null,
      'x-forwarded-for': null,
    })
    expect(resolveClientIp(headers)).toBe('5.5.5.5')
  })
})

describe('getErrorMessage', () => {
  it('extracts message from Error instance', () => {
    expect(getErrorMessage(new Error('timeout'))).toBe('timeout')
  })

  it('returns string reasons directly', () => {
    expect(getErrorMessage('network error')).toBe('network error')
  })

  it('returns "fetch failed" for unknown types', () => {
    expect(getErrorMessage(null)).toBe('fetch failed')
    expect(getErrorMessage(42)).toBe('fetch failed')
    expect(getErrorMessage({ msg: 'err' })).toBe('fetch failed')
  })
})
