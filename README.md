# ip-probe-vercel

Diagnostic POC to validate real client IP propagation through Vercel proxies toward two different backend targets:
- **Kubernetes auth-api** (via `AUTH_API_URL`)
- **Render echo API** (via `ECHO_API_URL`)

Comparing both targets is the core of the POC — it allows isolating whether a problem is in Vercel's IP forwarding or in Kubernetes.

## How It Works

Three API routes:

| Route | Runtime | Purpose |
|-------|---------|---------|
| `/api/probe-edge` | Edge | Fires parallel requests to both backends, forwards Vercel IP headers |
| `/api/probe-node` | Node.js | Same as edge but running on Node.js runtime |
| `/api/probe-direct` | Edge | Returns all raw incoming headers — baseline before any forwarding |

The dashboard compares the `remote_address` (TCP socket-level IP) and `ip_resolved_from_headers` from both backends across both runtimes.

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `AUTH_API_URL` | Base URL of the Kubernetes auth-api | `https://auth.mabible.com` |
| `ECHO_API_URL` | Base URL of the Render echo API | `https://ip-probe-echo-api.onrender.com` |

The backend endpoints called:
- `AUTH_API_URL/ip-inspect`
- `ECHO_API_URL/inspect`

Both should return JSON with at least:
```json
{
  "remote_address": "1.2.3.4",
  "ip_resolved_from_headers": "1.2.3.4"
}
```

## Local Development

```bash
# 1. Clone the repo
git clone <repo-url>
cd ip-probe-vercel

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.local.example .env.local
# Edit .env.local and fill in AUTH_API_URL and ECHO_API_URL

# 4. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

> **Note:** Vercel-specific headers (`x-vercel-forwarded-for`, `x-vercel-ip-country`, etc.) are **only set on Vercel deployments**, not locally.

## Deploying to Vercel

1. Push this repo to GitHub/GitLab/Bitbucket
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo
3. In **Settings → Environment Variables**, add:
   - `AUTH_API_URL` = `https://auth.mabible.com` (or your auth-api URL)
   - `ECHO_API_URL` = `https://ip-probe-echo-api.onrender.com` (or your echo API URL)
4. Deploy

## Interpreting Results

| Observation | Diagnosis |
|-------------|-----------|
| Render shows real client IP, Kubernetes shows `10.x.x.x` | `externalTrafficPolicy` issue on the Kubernetes Service — set it to `Local` |
| Both show the same non-client IP | Problem is upstream in Vercel — check proxy configuration |
| Both show the real client IP | Everything is working correctly ✓ |

## Vercel IP Headers

| Header | Description |
|--------|-------------|
| `x-vercel-forwarded-for` | Most reliable — set by Vercel, not overwritten by proxies |
| `x-real-ip` | Same as `x-forwarded-for` |
| `x-forwarded-for` | Standard header, can be overwritten by upstream proxies |
| `x-vercel-ip-country` | ISO 3166-1 country code |
| `x-vercel-ip-city` | City name (RFC3986 encoded) |
