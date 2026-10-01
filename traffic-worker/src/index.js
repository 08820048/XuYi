const GRAPHQL_URL = 'https://api.cloudflare.com/client/v4/graphql'
const CACHE_TTL_SECONDS = 3600
const SUMMARY_DAYS = 30
const HISTORY_DAYS = 180

const QUERY = `
  query ($zoneTag: String!, $start: Date!, $end: Date!) {
    viewer {
      zones(filter: { zoneTag: $zoneTag }) {
        httpRequests1dGroups(limit: 200, filter: { date_geq: $start, date_lt: $end }) {
          dimensions { date }
          sum { requests pageViews bytes }
          uniq { uniques }
        }
      }
    }
  }`

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }), request, env)
    }
    if (request.method !== 'GET' || url.pathname !== '/api/traffic') {
      return withCors(json({ error: 'Not found' }, 404, 'no-store'), request, env)
    }

    const cache = caches.default
    const cached = await cache.match(request)
    if (cached) return withCors(cached, request, env)

    let payload
    try {
      payload = await buildPayload(env)
    } catch (e) {
      console.error('traffic: failed to build payload', e)
      return withCors(
        json({ error: e instanceof ConfigError ? e.message : 'Failed to fetch analytics data', ...(e.product ? { product: e.product } : {}) }, e instanceof ConfigError ? 500 : 502, 'no-store'),
        request,
        env,
      )
    }

    const response = json(payload, 200)
    ctx.waitUntil(cache.put(request, response.clone()))
    return withCors(response, request, env)
  },
}

class ConfigError extends Error {}

async function buildPayload(env) {
  if (!env.CF_API_TOKEN) throw new ConfigError('Server misconfigured: missing API token')
  const products = parseProducts(env.PRODUCTS)
  if (products.length === 0) throw new ConfigError('Server misconfigured: empty product list')

  const { start, end, summaryStart, yesterday } = dateRange()
  const results = await Promise.all(
    products.map(async (p) => {
      try {
        return await fetchZoneStats(env.CF_API_TOKEN, p, { start, end, summaryStart, yesterday })
      } catch (e) {
        e.product = `${p.name} (${p.domain})`
        throw e
      }
    }),
  )

  return { updatedAt: new Date().toISOString(), rangeDays: SUMMARY_DAYS, products: results }
}

function parseProducts(raw) {
  let list
  try {
    list = JSON.parse(raw ?? '[]')
  } catch {
    throw new ConfigError('Server misconfigured: invalid PRODUCTS')
  }
  if (!Array.isArray(list)) throw new ConfigError('Server misconfigured: invalid PRODUCTS')
  return list.filter((p) => p && p.name && p.domain && p.zoneId)
}

function dateRange() {
  const now = new Date()
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const start = new Date(end.getTime() - HISTORY_DAYS * 86400_000)
  const summaryStart = new Date(end.getTime() - SUMMARY_DAYS * 86400_000)
  const yesterday = new Date(end.getTime() - 86400_000)
  const fmt = (d) => d.toISOString().slice(0, 10)
  return { start: fmt(start), end: fmt(end), summaryStart: fmt(summaryStart), yesterday: fmt(yesterday) }
}

async function fetchZoneStats(token, product, { start, end, summaryStart, yesterday }) {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: QUERY,
      variables: { zoneTag: product.zoneId, start, end },
    }),
  })
  if (!res.ok) throw new Error(`analytics API HTTP ${res.status}`)

  const body = await res.json()
  const zone = body?.data?.viewer?.zones?.[0]
  if (body?.errors?.length || !zone) {
    const detail = (body?.errors ?? []).map((e) => e.message).join('; ')
    throw new Error(`analytics API error: ${detail || 'zone not found or no permission'}`)
  }

  let requests = 0
  let pageViews = 0
  let bytes = 0
  let uniquesYesterday = 0
  const daily = (zone.httpRequests1dGroups ?? [])
    .slice()
    .sort((a, b) => (a.dimensions?.date < b.dimensions?.date ? -1 : 1))
    .map((group) => {
      const date = group.dimensions?.date
      const views = group.sum?.pageViews ?? 0
      if (date >= summaryStart) {
        requests += group.sum?.requests ?? 0
        pageViews += views
        bytes += group.sum?.bytes ?? 0
      }
      if (date === yesterday) uniquesYesterday = group.uniq?.uniques ?? 0
      return { date, pageViews: views }
    })

  return {
    name: product.name,
    domain: product.domain,
    requests,
    pageViews,
    bytes,
    uniquesYesterday,
    daily,
  }
}

function json(data, status, cacheControl) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cacheControl ?? `public, max-age=${CACHE_TTL_SECONDS}`,
    },
  })
}

function withCors(response, request, env) {
  const origin = request.headers.get('Origin')
  const allowed = (env.CORS_ORIGIN ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const headers = new Headers(response.headers)
  if (origin && allowed.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
    headers.set('Vary', 'Origin')
  }
  return new Response(response.body, { status: response.status, headers })
}
