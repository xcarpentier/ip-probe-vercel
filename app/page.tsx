'use client'

import { useState, useEffect, useCallback } from 'react'

interface VercelHeaders {
  xForwardedFor: string | null
  xRealIp: string | null
  xVercelForwardedFor: string | null
  xVercelIpCity: string | null
  xVercelIpCountry: string | null
}

interface BackendResult {
  remote_address?: string
  ip_resolved_from_headers?: string
  error?: string
  unreachable?: boolean
  [key: string]: unknown
}

interface ProbeResult {
  runtime: string
  client_ip_resolved: string
  vercel_headers: VercelHeaders
  auth_api: BackendResult
  echo_api: BackendResult
}

interface DirectResult {
  all_headers: Record<string, string>
  ip_candidates: {
    candidate_vercel_forwarded: string | null
    candidate_real_ip: string | null
    candidate_forwarded_for: string | null
  }
  resolved_ip: string
}

interface ProbeState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

const s = {
  page: {
    minHeight: '100vh',
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
    flexWrap: 'wrap' as const,
    gap: '12px',
  } as React.CSSProperties,
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#e6edf3',
    margin: 0,
  } as React.CSSProperties,
  btn: {
    background: '#21262d',
    color: '#c9d1d9',
    border: '1px solid #30363d',
    padding: '8px 16px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '13px',
    borderRadius: '4px',
  } as React.CSSProperties,
  summaryRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  summaryBox: (highlight: boolean): React.CSSProperties => ({
    flex: 1,
    minWidth: '200px',
    background: highlight ? '#3d0000' : '#161b22',
    border: `1px solid ${highlight ? '#ff4444' : '#30363d'}`,
    padding: '12px 16px',
    borderRadius: '6px',
  }),
  summaryLabel: {
    fontSize: '11px',
    color: '#8b949e',
    marginBottom: '4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  } as React.CSSProperties,
  summaryValue: (highlight: boolean): React.CSSProperties => ({
    fontSize: '18px',
    fontWeight: 'bold',
    color: highlight ? '#ff6b6b' : '#58a6ff',
  }),
  columns: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '24px',
  } as React.CSSProperties,
  column: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '16px',
  } as React.CSSProperties,
  columnTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#e6edf3',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid #30363d',
    margin: '0 0 12px 0',
  } as React.CSSProperties,
  subResult: {
    background: '#0d1117',
    border: '1px solid #21262d',
    borderRadius: '4px',
    padding: '12px',
    marginBottom: '8px',
  } as React.CSSProperties,
  subResultLabel: {
    fontSize: '11px',
    color: '#58a6ff',
    fontWeight: 'bold',
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
  } as React.CSSProperties,
  field: {
    marginBottom: '6px',
  } as React.CSSProperties,
  fieldLabel: {
    fontSize: '11px',
    color: '#8b949e',
  } as React.CSSProperties,
  fieldValue: (isPrivate: boolean): React.CSSProperties => ({
    color: isPrivate ? '#f85149' : '#10b981',
    fontWeight: 'bold',
  }),
  toggleBtn: {
    background: 'none',
    color: '#8b949e',
    border: '1px solid #21262d',
    padding: '3px 8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '11px',
    marginTop: '8px',
    borderRadius: '3px',
  } as React.CSSProperties,
  rawDump: {
    marginTop: '8px',
    background: '#0a0d12',
    border: '1px solid #21262d',
    padding: '8px',
    fontSize: '11px',
    color: '#8b949e',
    overflowX: 'auto' as const,
    maxHeight: '300px',
    overflowY: 'auto' as const,
    borderRadius: '3px',
  } as React.CSSProperties,
  error: {
    color: '#f85149',
    fontSize: '12px',
    padding: '8px',
  } as React.CSSProperties,
  loading: {
    color: '#8b949e',
    fontSize: '12px',
    padding: '8px',
  } as React.CSSProperties,
  legend: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '16px',
  } as React.CSSProperties,
  legendTitle: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#e6edf3',
    marginBottom: '12px',
    margin: '0 0 12px 0',
  } as React.CSSProperties,
  legendItem: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
    fontSize: '12px',
    alignItems: 'flex-start',
  } as React.CSSProperties,
  legendDot: (color: string): React.CSSProperties => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: color,
    marginTop: '4px',
    flexShrink: 0,
  }),
}

function isPrivateIp(ip: string | undefined | null): boolean {
  if (!ip) return false
  return (
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('172.') ||
    ip === 'unknown' ||
    ip === '127.0.0.1' ||
    ip === '::1'
  )
}

function BackendSubResult({
  label,
  data,
  loading,
  error,
  backendKey,
}: {
  label: string
  data: ProbeResult | null
  loading: boolean
  error: string | null
  backendKey: 'auth_api' | 'echo_api'
}) {
  const [showRaw, setShowRaw] = useState(false)

  if (loading) return (
    <div style={s.subResult}>
      <div style={s.subResultLabel}>{label}</div>
      <div style={s.loading}>Chargement...</div>
    </div>
  )

  if (error) return (
    <div style={s.subResult}>
      <div style={s.subResultLabel}>{label}</div>
      <div style={s.error}>Erreur: {error}</div>
    </div>
  )

  const backend = data?.[backendKey]

  return (
    <div style={s.subResult}>
      <div style={s.subResultLabel}>{label}</div>
      {backend?.unreachable ? (
        <div style={s.error}>⚠ Injoignable: {backend.error}</div>
      ) : (
        <>
          <div style={s.field}>
            <div style={s.fieldLabel}>adresse TCP brute (socket level)</div>
            <div style={s.fieldValue(isPrivateIp(backend?.remote_address))}>
              {backend?.remote_address ?? '—'}
            </div>
          </div>
          <div style={s.field}>
            <div style={s.fieldLabel}>IP résolue depuis headers</div>
            <div style={s.fieldValue(isPrivateIp(backend?.ip_resolved_from_headers))}>
              {backend?.ip_resolved_from_headers ?? '—'}
            </div>
          </div>
        </>
      )}
      <button
        style={s.toggleBtn}
        onClick={() => setShowRaw(v => !v)}
      >
        {showRaw ? 'Masquer headers bruts' : 'Afficher headers bruts'}
      </button>
      {showRaw && (
        <div style={s.rawDump}>
          <pre>{JSON.stringify(backend, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

function ColumnSection({
  title,
  edgeState,
  nodeState,
  backendKey,
}: {
  title: string
  edgeState: ProbeState<ProbeResult>
  nodeState: ProbeState<ProbeResult>
  backendKey: 'auth_api' | 'echo_api'
}) {
  return (
    <div style={s.column}>
      <h3 style={s.columnTitle}>{title}</h3>
      <BackendSubResult
        label="Edge runtime"
        data={edgeState.data}
        loading={edgeState.loading}
        error={edgeState.error}
        backendKey={backendKey}
      />
      <BackendSubResult
        label="Node runtime"
        data={nodeState.data}
        loading={nodeState.loading}
        error={nodeState.error}
        backendKey={backendKey}
      />
    </div>
  )
}

export default function Home() {
  const [edge, setEdge] = useState<ProbeState<ProbeResult>>({ data: null, loading: true, error: null })
  const [node, setNode] = useState<ProbeState<ProbeResult>>({ data: null, loading: true, error: null })
  const [direct, setDirect] = useState<ProbeState<DirectResult>>({ data: null, loading: true, error: null })

  const runProbes = useCallback(async (signal?: AbortSignal) => {
    const safeJson = async (url: string) => {
      const res = await fetch(url, { signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    }

    const [edgeRes, nodeRes, directRes] = await Promise.allSettled([
      safeJson('/api/probe-edge'),
      safeJson('/api/probe-node'),
      safeJson('/api/probe-direct'),
    ])

    if (signal?.aborted) return

    setEdge({
      data: edgeRes.status === 'fulfilled' ? edgeRes.value : null,
      loading: false,
      error: edgeRes.status === 'rejected' ? String(edgeRes.reason) : null,
    })
    setNode({
      data: nodeRes.status === 'fulfilled' ? nodeRes.value : null,
      loading: false,
      error: nodeRes.status === 'rejected' ? String(nodeRes.reason) : null,
    })
    setDirect({
      data: directRes.status === 'fulfilled' ? directRes.value : null,
      loading: false,
      error: directRes.status === 'rejected' ? String(directRes.reason) : null,
    })
  }, [])

  const handleRelancer = () => {
    setEdge({ data: null, loading: true, error: null })
    setNode({ data: null, loading: true, error: null })
    setDirect({ data: null, loading: true, error: null })
    runProbes()
  }

  useEffect(() => {
    const controller = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    runProbes(controller.signal)
    return () => controller.abort()
  }, [runProbes])

  const edgeIp = edge.data?.client_ip_resolved
  const nodeIp = node.data?.client_ip_resolved
  const directIp = direct.data?.ip_candidates?.candidate_vercel_forwarded

  const meaningfulIp = (ip: string | null | undefined) =>
    ip && ip !== 'unknown' ? ip : null
  const allIps = [edgeIp, nodeIp, directIp].map(meaningfulIp).filter(Boolean)
  const ipsMatch = allIps.length === 0 || allIps.every(ip => ip === allIps[0])

  return (
    <main style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>🔍 IP Probe Vercel</h1>
        <button style={s.btn} onClick={handleRelancer}>↺ Relancer</button>
      </div>

      {/* Summary Row */}
      <div style={s.summaryRow}>
        <div style={s.summaryBox(!ipsMatch && edgeIp !== allIps[0])}>
          <div style={s.summaryLabel}>Edge — IP résolue</div>
          <div style={s.summaryValue(!ipsMatch && edgeIp !== allIps[0])}>
            {edge.loading ? '…' : (edgeIp ?? 'erreur')}
          </div>
        </div>
        <div style={s.summaryBox(!ipsMatch && nodeIp !== allIps[0])}>
          <div style={s.summaryLabel}>Node — IP résolue</div>
          <div style={s.summaryValue(!ipsMatch && nodeIp !== allIps[0])}>
            {node.loading ? '…' : (nodeIp ?? 'erreur')}
          </div>
        </div>
        <div style={s.summaryBox(!ipsMatch && directIp !== allIps[0])}>
          <div style={s.summaryLabel}>Direct — x-vercel-forwarded-for</div>
          <div style={s.summaryValue(!ipsMatch && directIp !== allIps[0])}>
            {direct.loading ? '…' : (directIp ?? 'non défini')}
          </div>
        </div>
        {!ipsMatch && (
          <div style={{ ...s.summaryBox(true), borderColor: '#ff4444' }}>
            <div style={s.summaryLabel}>⚠ Divergence détectée</div>
            <div style={{ color: '#ff6b6b', fontSize: '12px', marginTop: '4px' }}>
              Les IPs résolues diffèrent entre les runtimes
            </div>
          </div>
        )}
      </div>

      {/* Two Columns */}
      <div style={s.columns}>
        <ColumnSection
          title="☸ Kubernetes auth-api"
          edgeState={edge}
          nodeState={node}
          backendKey="auth_api"
        />
        <ColumnSection
          title="🚀 Render echo API"
          edgeState={edge}
          nodeState={node}
          backendKey="echo_api"
        />
      </div>

      {/* Legend */}
      <div style={s.legend}>
        <h3 style={s.legendTitle}>📖 Guide de diagnostic</h3>
        <div style={s.legendItem}>
          <div style={s.legendDot('#f85149')} />
          <span>
            <strong>Render affiche la vraie IP client, Kubernetes affiche 10.x.x.x</strong>
            {' '}→ Le problème est <code>externalTrafficPolicy</code> sur le Service Kubernetes.
            Passer à <code>externalTrafficPolicy: Local</code> pour préserver l&apos;IP source.
          </span>
        </div>
        <div style={s.legendItem}>
          <div style={s.legendDot('#f0883e')} />
          <span>
            <strong>Les deux backends affichent la même IP non-client</strong>
            {' '}→ Le problème est en amont dans Vercel (configuration proxy).
          </span>
        </div>
        <div style={s.legendItem}>
          <div style={s.legendDot('#10b981')} />
          <span>
            <strong>Les deux backends affichent la vraie IP client</strong>
            {' '}→ Tout fonctionne correctement ✓
          </span>
        </div>
        <div style={{ marginTop: '12px', fontSize: '11px', color: '#6e7681' }}>
          <strong>Légende couleurs :</strong>{' '}
          <span style={{ color: '#10b981' }}>vert</span> = IP publique (probablement correcte) ·{' '}
          <span style={{ color: '#f85149' }}>rouge</span> = IP privée/interne (10.x, 192.168.x) ou inconnue
        </div>
      </div>
    </main>
  )
}
