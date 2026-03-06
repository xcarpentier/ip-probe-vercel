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

interface GeoData {
  city?: string
  country?: string
  countryRegion?: string
  latitude?: string
  longitude?: string
  region?: string
}

interface GeoHeaders {
  'x-vercel-ip-city': string | null
  'x-vercel-ip-country': string | null
  'x-vercel-ip-country-region': string | null
  'x-vercel-ip-latitude': string | null
  'x-vercel-ip-longitude': string | null
  'x-vercel-ip-timezone': string | null
}

interface DirectResult {
  all_headers: Record<string, string>
  ip_candidates: {
    candidate_vercel_forwarded: string | null
    candidate_real_ip: string | null
    candidate_forwarded_for: string | null
  }
  resolved_ip: string
  geo_from_request_geo: GeoData | null
  geo_from_headers: GeoHeaders
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

      {/* Architecture Diagram */}
      <div style={{ marginBottom: '24px', background: '#161b22', border: '1px solid #30363d', borderRadius: '6px', padding: '16px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 'bold', color: '#e6edf3' }}>Architecture</h3>
        <svg viewBox="0 0 900 480" style={{ width: '100%', maxHeight: '340px', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
          <rect width="900" height="480" fill="#050d18" rx="4" />

          {/* Vercel zone */}
          <rect x="195" y="75" width="285" height="340" rx="6" fill="none" stroke="#7c3aed" strokeWidth="2" />
          <text x="280" y="62" fill="#a78bfa" fontSize="18" fontWeight="bold" fontFamily="monospace">Vercel</text>

          {/* Render zone */}
          <rect x="545" y="40" width="240" height="200" rx="6" fill="none" stroke="#16a34a" strokeWidth="2" />
          <text x="620" y="28" fill="#4ade80" fontSize="18" fontWeight="bold" fontFamily="monospace">Render</text>

          {/* Kubernetes zone */}
          <rect x="545" y="275" width="340" height="190" rx="6" fill="none" stroke="#1d4ed8" strokeWidth="2" />
          <text x="620" y="263" fill="#60a5fa" fontSize="18" fontWeight="bold" fontFamily="monospace">Kubernetes</text>

          {/* Browser ellipse */}
          <ellipse cx="90" cy="245" rx="75" ry="55" fill="#1a1a2e" stroke="#8b949e" strokeWidth="1.5" />
          <text x="90" y="235" textAnchor="middle" fill="#c9d1d9" fontSize="13" fontFamily="monospace">⬜ Browser</text>
          <text x="90" y="255" textAnchor="middle" fill="#8b949e" fontSize="13" fontFamily="monospace">A.B.C.D</text>

          {/* proxy edge box */}
          <rect x="235" y="145" width="200" height="65" rx="4" fill="#1f1035" stroke="#6d28d9" strokeWidth="1.5" />
          <text x="335" y="182" textAnchor="middle" fill="#c9d1d9" fontSize="15" fontFamily="monospace">proxy edge</text>

          {/* proxy node box */}
          <rect x="235" y="285" width="200" height="65" rx="4" fill="#1f1035" stroke="#6d28d9" strokeWidth="1.5" />
          <text x="335" y="322" textAnchor="middle" fill="#c9d1d9" fontSize="15" fontFamily="monospace">proxy node</text>

          {/* echo-api box */}
          <rect x="580" y="75" width="170" height="130" rx="4" fill="#0f2010" stroke="#16a34a" strokeWidth="1.5" />
          <text x="665" y="130" textAnchor="middle" fill="#c9d1d9" fontSize="14" fontFamily="monospace">echo-api</text>
          <text x="665" y="150" textAnchor="middle" fill="#8b949e" fontSize="13" fontFamily="monospace">/inspect</text>

          {/* nginx ingress box */}
          <rect x="575" y="305" width="155" height="65" rx="4" fill="#0d1625" stroke="#1d4ed8" strokeWidth="1.5" />
          <text x="652" y="342" textAnchor="middle" fill="#c9d1d9" fontSize="13" fontFamily="monospace">nginx ingress</text>

          {/* auth-api box */}
          <rect x="760" y="305" width="110" height="65" rx="4" fill="#0d1625" stroke="#1d4ed8" strokeWidth="1.5" />
          <text x="815" y="332" textAnchor="middle" fill="#c9d1d9" fontSize="12" fontFamily="monospace">auth-api</text>
          <text x="815" y="350" textAnchor="middle" fill="#8b949e" fontSize="11" fontFamily="monospace">/ip-inspect</text>

          {/* Arrow marker */}
          <defs>
            <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#8b949e" />
            </marker>
          </defs>

          {/* Browser → proxy edge */}
          <path d="M165,225 C185,205 210,190 235,178" fill="none" stroke="#8b949e" strokeWidth="1.5" markerEnd="url(#arr)" />
          {/* Browser → proxy node */}
          <path d="M165,262 C185,275 210,300 235,317" fill="none" stroke="#8b949e" strokeWidth="1.5" markerEnd="url(#arr)" />

          {/* proxy edge → echo-api (straight) */}
          <path d="M435,165 C490,150 520,130 580,125" fill="none" stroke="#8b949e" strokeWidth="1.5" markerEnd="url(#arr)" />
          {/* proxy node → echo-api (cross up) */}
          <path d="M435,305 C490,290 520,180 580,145" fill="none" stroke="#8b949e" strokeWidth="1.5" markerEnd="url(#arr)" />

          {/* proxy edge → nginx ingress (cross down) */}
          <path d="M435,195 C490,240 520,300 575,325" fill="none" stroke="#8b949e" strokeWidth="1.5" markerEnd="url(#arr)" />
          {/* proxy node → nginx ingress (straight) */}
          <path d="M435,335 C490,338 520,338 575,338" fill="none" stroke="#8b949e" strokeWidth="1.5" markerEnd="url(#arr)" />

          {/* nginx ingress → auth-api */}
          <path d="M730,337 L760,337" fill="none" stroke="#8b949e" strokeWidth="1.5" markerEnd="url(#arr)" />
        </svg>
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

      {/* Geo Section */}
      <div style={{ marginBottom: '24px', background: '#161b22', border: '1px solid #30363d', borderRadius: '6px', padding: '16px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 'bold', color: '#e6edf3' }}>Géolocalisation (probe-direct, Edge runtime)</h3>
        {direct.loading ? (
          <div style={s.loading}>Chargement...</div>
        ) : direct.error ? (
          <div style={s.error}>Erreur: {direct.error}</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#58a6ff', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>request.geo (Next.js Edge)</div>
              {direct.data?.geo_from_request_geo ? (
                Object.entries(direct.data.geo_from_request_geo).map(([k, v]) => (
                  <div key={k} style={s.field}>
                    <span style={s.fieldLabel}>{k}: </span>
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>{v ?? '—'}</span>
                  </div>
                ))
              ) : (
                <div style={s.error}>null — Vercel ne fournit pas de géo pour cette IP</div>
              )}
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#58a6ff', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>Headers bruts x-vercel-ip-*</div>
              {direct.data?.geo_from_headers && Object.entries(direct.data.geo_from_headers).map(([k, v]) => (
                <div key={k} style={s.field}>
                  <span style={s.fieldLabel}>{k}: </span>
                  <span style={{ color: v ? '#10b981' : '#f85149', fontWeight: 'bold' }}>{v ?? 'null'}</span>
                </div>
              ))}
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
