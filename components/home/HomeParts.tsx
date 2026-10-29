'use client'

import { useEffect, useState } from 'react'
import { t as translate } from '@/lib/i18n'
import { useLocale } from '@/lib/i18n-client'
import { freeProject, productPlan, projects } from '@/lib/portfolio'

const KIND: Record<string, string> = {
  ornata: 'Mac',
  folio: 'Mac',
  toolpop: 'Web',
  berth: 'Mac',
  citu: 'Web',
  runnock: 'Mac',
  hoolo: 'Mac',
  chupin: 'Web',
  welight: 'Web',
  clibo: 'Mac',
  xingchao: 'Self-host',
  jevsift: 'API',
}

const pad = (n: number) => String(n).padStart(3, '0')
const clamp = (value: number) => Math.min(1, Math.max(0, value))

/** 页首四条细线：今天、本周、本月、今年的进度，让时间的流逝变得可见。 */
export function TimeLines() {
  const locale = useLocale()
  const [values, setValues] = useState<number[] | null>(null)

  useEffect(() => {
    const compute = () => {
      const now = new Date()
      const day0 = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const day = (now.getTime() - day0.getTime()) / 864e5
      const week0 = day0.getTime() - ((now.getDay() + 6) % 7) * 864e5
      const week = (now.getTime() - week0) / (7 * 864e5)
      const month0 = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
      const month1 = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime()
      const year0 = new Date(now.getFullYear(), 0, 1).getTime()
      const year1 = new Date(now.getFullYear() + 1, 0, 1).getTime()
      setValues([
        clamp(day),
        clamp(week),
        clamp((now.getTime() - month0) / (month1 - month0)),
        clamp((now.getTime() - year0) / (year1 - year0)),
      ])
    }
    compute()
    const timer = window.setInterval(compute, 60000)
    return () => window.clearInterval(timer)
  }, [])

  const labels = [
    translate(locale, 'timeToday'),
    translate(locale, 'timeWeek'),
    translate(locale, 'timeMonth'),
    translate(locale, 'timeYear'),
  ]

  return (
    <div className="hp-time" aria-label={translate(locale, 'timeAria')}>
      {labels.map((label, i) => {
        const value = values?.[i] ?? 0
        return (
          <div className="hp-tl" key={label}>
            <div className="hp-tl-head">
              <span>{label}</span>
              <b>{values ? `${Math.round(value * 100)}%` : ''}</b>
            </div>
            <div className="hp-tl-bar">
              <i style={{ width: `${value * 100}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** 100 格产品索引：每个格子一个产品，悬停 / 点击在右侧查看详情。 */
export function ProductIndex() {
  const locale = useLocale()
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key)
  const products = [...freeProject, ...projects]
  const goal = productPlan.goal
  const [active, setActive] = useState(products.length - 1)
  const [pinned, setPinned] = useState(products.length - 1)
  const product = products[active]
  const host = new URL(product.link).host

  return (
    <section className="hp-index" aria-label={t('indexTitle')}>
      <div className="hp-sec-head">
        <h2>
          {t('indexTitle')} <em>/ Index</em>
        </h2>
        <span className="hp-mono">{t('indexHint')}</span>
      </div>
      <div className="hp-layout">
        <div>
          <div className="hp-gridwrap">
            <div className="hp-ticks-x" aria-hidden="true">
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i}>{i + 1}</span>
              ))}
            </div>
            <div className="hp-ticks-y" aria-hidden="true">
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i}>{i * 10 + 1}</span>
              ))}
            </div>
            <div className="hp-grid" onMouseLeave={() => setActive(pinned)}>
              {Array.from({ length: goal }, (_, i) => {
                const item = products[i]
                const state = item ? 'done' : i === products.length ? 'next' : 'todo'
                const content = (
                  <>
                    <span className="hp-n">{pad(i + 1)}</span>
                    {item && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.logo} alt="" />
                    )}
                  </>
                )
                const style = { animationDelay: `${i * 9}ms` }
                return item ? (
                  <button
                    key={i}
                    type="button"
                    className={`hp-cell is-${state}${active === i ? ' is-on' : ''}`}
                    style={style}
                    aria-label={`${pad(i + 1)} ${item.name}`}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onClick={() => {
                      setActive(i)
                      setPinned(i)
                    }}
                  >
                    {content}
                  </button>
                ) : (
                  <div key={i} className={`hp-cell is-${state}`} style={style} aria-hidden="true">
                    {content}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="hp-legend hp-mono">
            <span><i className="a" />{t('legendLive')}</span>
            <span><i className="b" />{t('legendNext')}</span>
            <span><i className="c" />{t('legendTodo')}</span>
          </div>
        </div>

        <aside className="hp-detail" aria-live="polite">
          <div className="hp-fade" key={product.id}>
            <div className="hp-big" aria-hidden="true">{pad(active + 1)}</div>
            <h3>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.logo} alt="" />
              {product.name}
              {product.badge && <span className="hp-tag">{product.badge}</span>}
            </h3>
            <p className="hp-desc">{locale === 'en' ? product.descEn : product.desc}</p>
            <p className="hp-mono hp-meta">
              {KIND[product.id] ?? 'Web'} · {host}
            </p>
            <a className="hp-go" href={product.link} target="_blank" rel="noreferrer">
              {t('visit')} <span>→</span>
            </a>
          </div>
        </aside>
      </div>
    </section>
  )
}

/**
 * 首页背景：一张淡淡的坐标网格（和 100 格索引同一种语言），鼠标靠近时网格和交叉点被“点亮”，
 * 右下角用等宽字显示光标坐标；右上角一团很淡的强调色光慢慢漂移。纯装饰，不拦截鼠标。
 */
export function HomeBackdrop() {
  const [coords, setCoords] = useState<string | null>(null)

  useEffect(() => {
    const root = document.documentElement
    if (!window.matchMedia('(pointer: fine)').matches) return
    let frame = 0
    const onMove = (event: PointerEvent) => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        root.style.setProperty('--hp-mx', `${event.clientX}px`)
        root.style.setProperty('--hp-my', `${event.clientY}px`)
        setCoords(`X ${String(Math.round(event.clientX)).padStart(4, '0')} · Y ${String(Math.round(event.clientY)).padStart(4, '0')}`)
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      if (frame) cancelAnimationFrame(frame)
      root.style.removeProperty('--hp-mx')
      root.style.removeProperty('--hp-my')
    }
  }, [])

  return (
    <div className="hp-bg" aria-hidden="true">
      <div className="hp-bg-glow" />
      <div className="hp-bg-grid" />
      <div className="hp-bg-spot" />
      {coords && <span className="hp-bg-coords hp-mono">{coords}</span>}
    </div>
  )
}
