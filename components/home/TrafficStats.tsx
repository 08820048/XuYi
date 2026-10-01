'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { TRAFFIC_API } from '@/lib/portfolio'

type TrafficResponse = {
  products: { name: string; domain: string; daily?: { date: string; pageViews: number }[] }[]
}

const RANGES = [7, 14, 30, 90] as const
type Range = (typeof RANGES)[number]

const RES = 128
const HEADROOM = 0.84
const BLOG_DOMAIN = 'xuyi.dev'
const TRANSITION_MS = 460
const TICK_FRACS = [1, 0.66, 0.33, 0]

const MARKER_CFG = { stiffness: 650, damping: 42, mass: 0.5 }
const HERO_CFG = { stiffness: 190, damping: 27, mass: 0.7 }
const PILL_CFG = { stiffness: 385, damping: 31, mass: 1 }

type SpringCfg = { stiffness: number; damping: number; mass: number }

class Spring {
  value: number
  target: number
  velocity = 0
  private cfg: SpringCfg

  constructor(value: number, cfg: SpringCfg) {
    this.value = value
    this.target = value
    this.cfg = cfg
  }

  step(dt: number) {
    const { stiffness: k, damping: c, mass: m } = this.cfg
    const steps = Math.max(1, Math.min(8, Math.ceil(dt / (1 / 240))))
    const h = dt / steps
    for (let i = 0; i < steps; i++) {
      const a = (-k * (this.value - this.target) - c * this.velocity) / m
      this.velocity += a * h
      this.value += this.velocity * h
    }
    return this.value
  }

  snap(value: number) {
    this.value = value
    this.target = value
    this.velocity = 0
  }
}

function smoothSample(values: ArrayLike<number>, f: number) {
  const n = values.length
  if (n === 0) return 0
  if (n === 1) return values[0]
  const x = f * (n - 1)
  const i0 = Math.min(n - 2, Math.floor(x))
  const t = x - i0
  const s = t * t * (3 - 2 * t)
  return values[i0] * (1 - s) + values[i0 + 1] * s
}

function resample(values: number[], res: number) {
  const out = new Float32Array(res)
  for (let i = 0; i < res; i++) out[i] = smoothSample(values, res > 1 ? i / (res - 1) : 0)
  return out
}

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function labelMD(date: string) {
  return date.slice(5)
}

function hash2(x: number, y: number) {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return v - Math.floor(v)
}

function formatTick(value: number) {
  if (value >= 10000) return `${Math.round(value / 1000)}k`
  return Math.round(value).toLocaleString()
}

function buildSeries(data: TrafficResponse, tab: 'work' | 'blog') {
  const map = new Map<string, number>()
  for (const product of data.products) {
    const isBlog = product.domain === BLOG_DOMAIN
    if (tab === 'blog' ? !isBlog : isBlog) continue
    for (const day of product.daily ?? []) {
      map.set(day.date, (map.get(day.date) ?? 0) + day.pageViews)
    }
  }
  return map
}

function buildView(map: Map<string, number>, days: number) {
  const known = [...map.keys()].sort()
  if (known.length === 0) return null
  const endDate = known[known.length - 1]
  const dates: string[] = []
  const values: number[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = shiftDate(endDate, -i)
    dates.push(date)
    values.push(map.get(date) ?? 0)
  }
  let total = 0
  let prevTotal = 0
  for (const v of values) total += v
  for (let i = days * 2 - 1; i >= days; i--) prevTotal += map.get(shiftDate(endDate, -i)) ?? 0
  return { dates, values, total, prevTotal }
}

function EyeGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function TrafficStats({ tab }: { tab: 'work' | 'blog' }) {
  const [data, setData] = useState<TrafficResponse | null>(null)
  const [range, setRange] = useState<Range>(30)

  const heroRef = useRef<HTMLDivElement>(null)
  const deltaRef = useRef<HTMLDivElement>(null)
  const plotRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const crossRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<HTMLDivElement>(null)
  const readoutRef = useRef<HTMLDivElement>(null)
  const readoutDateRef = useRef<HTMLSpanElement>(null)
  const readoutValueRef = useRef<HTMLSpanElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLDivElement>(null)
  const rangeBtnRefs = useRef<(HTMLButtonElement | null)[]>([])
  const ytickRefs = useRef<(HTMLSpanElement | null)[]>([])

  const reducedRef = useRef(false)
  const viewRef = useRef<ReturnType<typeof buildView>>(null)

  const anim = useRef({
    blended: new Float32Array(RES),
    from: new Float32Array(RES),
    to: new Float32Array(RES),
    max: 1,
    fromMax: 1,
    toMax: 1,
    transStart: -1,
    glow: new Float32Array(0),
    glowCols: 0,
    glowRows: 0,
    px: 0,
    py: 0,
    rawX: 0,
    rawY: 0,
    pointerSeen: false,
    glowRadius: 0,
    markerOn: false,
    hero: new Spring(0, HERO_CFG),
    markX: new Spring(50, MARKER_CFG),
    markY: new Spring(50, MARKER_CFG),
    pillX: new Spring(0, PILL_CFG),
    pillW: new Spring(0, PILL_CFG),
    pillInit: false,
    last: 0,
  })

  const view = useMemo(() => {
    if (!data) return null
    return buildView(buildSeries(data, tab), range)
  }, [data, tab, range])

  useEffect(() => {
    viewRef.current = view
  }, [view])

  useEffect(() => {
    let alive = true
    fetch(TRAFFIC_API)
      .then((res) => (res.ok ? res.json() : null))
      .then((body: TrafficResponse | null) => {
        if (alive && body?.products) setData(body)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!view) return
    const a = anim.current
    const reduced = reducedRef.current
    a.from.set(a.blended)
    a.fromMax = a.max
    a.to.set(resample(view.values, RES))
    a.toMax = Math.max(1, ...view.values)
    if (reduced) {
      a.blended.set(a.to)
      a.max = a.toMax
      a.transStart = -1
    } else {
      a.transStart = performance.now()
    }
    a.hero.target = view.total
    if (reduced) {
      a.hero.snap(view.total)
      if (heroRef.current) heroRef.current.textContent = `+${Math.round(view.total).toLocaleString()}`
    }
    const delta = view.prevTotal > 0 ? (view.total - view.prevTotal) / view.prevTotal : 0
    if (deltaRef.current) {
      const down = delta < 0
      deltaRef.current.textContent = view.prevTotal > 0 ? `${down ? '↓' : '↑'} ${Math.round(Math.abs(delta) * 100)}%` : '—'
      deltaRef.current.classList.toggle('is-down', down)
    }
  }, [view])

  useEffect(() => {
    const track = trackRef.current
    const pill = pillRef.current
    if (!track || !pill) return
    const place = (snap: boolean) => {
      const btn = rangeBtnRefs.current[RANGES.indexOf(range)]
      if (!btn) return
      const a = anim.current
      a.pillX.target = btn.offsetLeft
      a.pillW.target = btn.offsetWidth
      if (snap || reducedRef.current || !a.pillInit) {
        a.pillX.snap(btn.offsetLeft)
        a.pillW.snap(btn.offsetWidth)
        a.pillInit = true
      }
      pill.style.transform = `translateX(${a.pillX.value}px)`
      pill.style.width = `${a.pillW.value}px`
    }
    place(true)
    const observer = new ResizeObserver(() => place(true))
    observer.observe(track)
    return () => observer.disconnect()
  }, [range])

  useEffect(() => {
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedRef.current = reducedQuery.matches

    const a = anim.current
    const onPointer = (event: PointerEvent) => {
      a.rawX = event.clientX
      a.rawY = event.clientY
      a.pointerSeen = true
    }
    window.addEventListener('pointermove', onPointer, { passive: true })

    let raf = 0
    const draw = (now: number) => {
      const canvas = canvasRef.current
      const plot = plotRef.current
      if (!canvas || !plot) return
      const w = plot.clientWidth
      const h = plot.clientHeight
      if (w === 0 || h === 0) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const dpr = Math.min(2, window.devicePixelRatio || 1)
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
        canvas.style.width = `${w}px`
        canvas.style.height = `${h}px`
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, w, h)

      const cell = Math.max(3, Math.round(w / 180))
      const cols = Math.ceil(w / cell)
      const rows = Math.ceil(h / cell)
      if (a.glowCols !== cols || a.glowRows !== rows) {
        a.glow = new Float32Array(cols * rows)
        a.glowCols = cols
        a.glowRows = rows
      }

      const reduced = reducedRef.current
      const restColor = 'oklch(0.9 0.02 264)'
      const accent = '37, 99, 235'

      for (let c = 0; c < cols; c++) {
        const f = cols > 1 ? c / (cols - 1) : 0
        const v = smoothSample(a.blended, f)
        const curveY = h * (1 - (v / a.max) * HEADROOM)
        for (let r = 0; r < rows; r++) {
          const cy = r * cell + cell / 2
          if (cy < curveY) continue
          const cx = c * cell + cell / 2

          let glow = 0
          if (!reduced && a.pointerSeen) {
            const dist = Math.hypot(cx - a.px, cy - a.py)
            const idx = r * cols + c
            const target = dist < a.glowRadius ? 1 : 0
            glow = a.glow[idx] + (target - a.glow[idx]) * (target ? 0.22 : 0.05)
            a.glow[idx] = glow
          }

          ctx.fillStyle = restColor
          ctx.fillRect(c * cell, r * cell, cell, cell)

          const prox = Math.max(0, 1 - (cy - curveY) / (cell * 12))
          const shimmer = reduced ? 1 : 1 + 0.07 * Math.sin((cy / h) * Math.PI * 3 - now * 0.0015)
          let scale = (0.25 + 0.45 * prox) * shimmer
          let alpha = (0.1 + 0.9 * prox) * shimmer
          let ox = 0
          let oy = 0
          if (!reduced && hash2(c, r) < 0.06) {
            ox = Math.sin(now * 0.004 + hash2(r, c) * Math.PI * 2) * cell * 0.3
            oy = Math.cos(now * 0.005 + hash2(c + 7, r) * Math.PI * 2) * cell * 0.3
          }
          if (glow > 0) {
            alpha = Math.min(1, alpha + glow * 0.55)
            scale *= 1 + glow * 0.35
          }
          if (alpha < 0.02) continue
          const size = cell * Math.min(0.7, scale)
          ctx.globalAlpha = alpha
          ctx.fillStyle = `rgba(${accent}, 1)`
          ctx.fillRect(cx - size / 2 + ox, cy - size / 2 + oy, size, size)
          ctx.globalAlpha = 1
        }
      }
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, Math.max(0.001, (now - a.last) / 1000))
      a.last = now
      if (document.hidden) return

      if (a.transStart >= 0) {
        const t = reducedRef.current ? 1 : Math.min(1, (now - a.transStart) / TRANSITION_MS)
        for (let i = 0; i < RES; i++) a.blended[i] = a.from[i] + (a.to[i] - a.from[i]) * t
        a.max = a.fromMax + (a.toMax - a.fromMax) * t
        if (t >= 1) a.transStart = -1
      }

      for (let i = 0; i < TICK_FRACS.length; i++) {
        const el = ytickRefs.current[i]
        const text = formatTick(a.max * TICK_FRACS[i])
        if (el && el.textContent !== text) el.textContent = text
      }

      if (!reducedRef.current) a.hero.step(dt)
      if (heroRef.current) heroRef.current.textContent = `+${Math.round(a.hero.value).toLocaleString()}`

      const plot = plotRef.current
      if (plot) {
        const rect = plot.getBoundingClientRect()
        if (a.pointerSeen) {
          const rx = a.rawX - rect.left
          const ry = a.rawY - rect.top
          const speed = Math.hypot(rx - a.px, ry - a.py)
          a.px += (rx - a.px) * 0.45
          a.py += (ry - a.py) * 0.45
          a.glowRadius = rect.height * (0.24 + 0.26 * Math.min(1, speed / 60))
        }

        if (!reducedRef.current) {
          a.markX.step(dt)
          a.markY.step(dt)
          a.pillX.step(dt)
          a.pillW.step(dt)
        }
        const markerX = (a.markX.value / 100) * rect.width
        const markerY = (a.markY.value / 100) * rect.height
        if (crossRef.current) crossRef.current.style.transform = `translateX(${markerX}px)`
        if (markerRef.current) markerRef.current.style.transform = `translate(${markerX}px, ${markerY}px) translate(-50%, -50%)`
        if (readoutRef.current) {
          const half = readoutRef.current.offsetWidth / 2
          const clamped = Math.min(rect.width - half - 2, Math.max(half + 2, markerX))
          readoutRef.current.style.transform = `translate(${clamped}px, ${markerY - 16}px) translate(-50%, -100%)`
        }
        if (pillRef.current) {
          pillRef.current.style.transform = `translateX(${a.pillX.value}px)`
          pillRef.current.style.width = `${a.pillW.value}px`
        }
      }

      draw(now)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onPointer)
    }
  }, [])

  function scrub(event: React.PointerEvent) {
    const a = anim.current
    const view = viewRef.current
    const plot = plotRef.current
    if (!view || !plot) return
    const rect = plot.getBoundingClientRect()
    const n = view.values.length
    const frac = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    const idx = Math.round(frac * (n - 1))
    const max = Math.max(1, ...view.values)
    a.markX.target = n > 1 ? (idx / (n - 1)) * 100 : 50
    a.markY.target = (1 - (view.values[idx] / max) * HEADROOM) * 100
    if (reducedRef.current) {
      a.markX.snap(a.markX.target)
      a.markY.snap(a.markY.target)
    }
    if (readoutDateRef.current) readoutDateRef.current.textContent = labelMD(view.dates[idx])
    if (readoutValueRef.current) readoutValueRef.current.textContent = view.values[idx].toLocaleString()
  }

  function setScrubbing(on: boolean) {
    anim.current.markerOn = on
    plotRef.current?.classList.toggle('is-scrubbing', on)
  }

  if (!view) return null

  return (
    <div className="pf-stats">
      <div className="pf-stats-kpi">
        <div className="pf-stats-kpi-head">
          <span className="pf-stats-kpi-icon"><EyeGlyph /></span>
          <span className="pf-stats-kpi-label">{tab === 'blog' ? '博客浏览量' : '作品浏览量'}</span>
        </div>
        <div className="pf-stats-kpi-hero" ref={heroRef}>+0</div>
        <div className="pf-stats-kpi-delta" ref={deltaRef}>—</div>
      </div>

      <div className="pf-stats-chart">
        <div className="pf-stats-graph">
          <div className="pf-stats-yaxis" aria-hidden="true">
            {TICK_FRACS.map((frac, i) => (
              <span
                key={frac}
                className="pf-stats-ytick"
                style={{ top: `${(1 - frac) * 100}%` }}
                ref={(el) => {
                  ytickRefs.current[i] = el
                }}
              />
            ))}
          </div>
          <div className="pf-stats-plot" ref={plotRef}>
            <div className="pf-stats-hatch" aria-hidden="true" />
            {[0.3333, 0.6667].map((top) => (
              <div key={top} className="pf-stats-line" style={{ top: `${top * 100}%` }} aria-hidden="true" />
            ))}
            <div className="pf-stats-line is-base" aria-hidden="true" />
            <canvas ref={canvasRef} className="pf-stats-canvas" />
            <div className="pf-stats-cross" ref={crossRef} aria-hidden="true" />
            <div className="pf-stats-marker" ref={markerRef} aria-hidden="true" />
            <div className="pf-stats-readout" ref={readoutRef} aria-hidden="true">
              <span className="pf-stats-readout-date" ref={readoutDateRef} />
              <span className="pf-stats-readout-value" ref={readoutValueRef} />
            </div>
            <div
              className="pf-stats-scrub"
              onPointerDown={(e) => {
                setScrubbing(true)
                scrub(e)
              }}
              onPointerMove={scrub}
              onPointerEnter={() => setScrubbing(true)}
              onPointerLeave={() => setScrubbing(false)}
            />
          </div>
        </div>
        <div className="pf-stats-xaxis" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => {
            const idx = Math.round((i * (view.dates.length - 1)) / 4)
            return <span key={i}>{labelMD(view.dates[idx])}</span>
          })}
        </div>
      </div>

      <div className="pf-stats-ranges" ref={trackRef} role="tablist" aria-label="时间范围">
        <span className="pf-stats-pill" ref={pillRef} aria-hidden="true" />
        {RANGES.map((r, i) => (
          <button
            key={r}
            ref={(el) => {
              rangeBtnRefs.current[i] = el
            }}
            type="button"
            role="tab"
            aria-selected={range === r}
            onClick={() => setRange(r)}
          >
            {r}天
          </button>
        ))}
      </div>
    </div>
  )
}
