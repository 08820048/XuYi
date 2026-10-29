'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { t as translate, type Locale } from '@/lib/i18n'
import { useLocale } from '@/lib/i18n-client'
import { freeProject, projects, type Product } from '@/lib/portfolio'
import { AppleIcon } from './icons'

const VIDEO = /\.(mp4|webm|mov)$/i
const MENUBAR = 26
const DOCK_SPACE = 100

type Win = { id: string; x: number; y: number; w: number; h: number; z: number; min: boolean; max: boolean; origin: string }

function ctaLabel(product: Product, locale: Locale) {
  if (locale === 'zh') return product.cta.replace(/\s*→\s*$/, '')
  if (product.cta.includes('购买')) return translate(locale, 'buy')
  return translate(locale, 'visit')
}

const MENUS = {
  zh: ['文件', '编辑', '显示', '窗口', '帮助'],
  en: ['File', 'Edit', 'View', 'Window', 'Help'],
} as const

/**
 * 产品展示做成一块“Mac 桌面”：顶部菜单栏、底部 Dock（鼠标靠近时图标按距离放大、启动时弹跳），
 * 点一个图标就像启动应用一样弹出一个窗口，里面是产品官网（不允许嵌入的回退为截图 + 简介）。
 * 窗口可以多开、拖动、点击置前；红灯关闭、黄灯最小化到 Dock、绿灯放大，双击标题栏同样放大。
 */
export function ProductDesktop() {
  const locale = useLocale()
  const products = [...freeProject, ...projects]
  const [wins, setWins] = useState<Win[]>([])
  const [dragging, setDragging] = useState<string | null>(null)
  const [launching, setLaunching] = useState<string | null>(null)
  const [clock, setClock] = useState('')
  const zRef = useRef(1)

  const screenRef = useRef<HTMLDivElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  const iconRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const drag = useRef<{ id: string; startX: number; startY: number; baseX: number; baseY: number } | null>(null)

  const byId = (id: string) => products.find((product) => product.id === id)
  const visible = wins.filter((win) => !win.min)
  const topId = visible.reduce<Win | null>((best, win) => (!best || win.z > best.z ? win : best), null)?.id ?? null
  const topProduct = topId ? byId(topId) : null

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', {
          weekday: 'short',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
      )
    tick()
    const timer = window.setInterval(tick, 20000)
    return () => window.clearInterval(timer)
  }, [locale])

  const focus = useCallback((id: string) => {
    setWins((list) => list.map((win) => (win.id === id ? { ...win, z: ++zRef.current, min: false } : win)))
  }, [])

  const openApp = useCallback(
    (id: string) => {
      const screen = screenRef.current?.getBoundingClientRect()
      if (!screen) return
      const existing = wins.find((win) => win.id === id)
      if (existing) {
        focus(id)
        return
      }
      const product = products.find((item) => item.id === id)
      const live = product?.embed !== false
      const narrow = screen.width < 760
      const w = Math.min(live ? 900 : 700, screen.width - 24)
      const h = live
        ? Math.min(540, screen.height - MENUBAR - DOCK_SPACE)
        : narrow
          ? Math.min(560, screen.height - MENUBAR - DOCK_SPACE)
          : 360
      const n = wins.length % 5
      const x = Math.max(8, (screen.width - w) / 2 + (n - 2) * 28)
      const y = MENUBAR + 14 + n * 26
      setLaunching(id)
      window.setTimeout(() => setLaunching((current) => (current === id ? null : current)), 800)
      setWins((list) => [...list, { id, x, y, w, h, z: ++zRef.current, min: false, max: false, origin: '50% 100%' }])
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wins, focus],
  )

  const closeWin = (id: string) => setWins((list) => list.filter((win) => win.id !== id))

  const minimize = (id: string) => {
    const screen = screenRef.current?.getBoundingClientRect()
    const icon = iconRefs.current[id]?.getBoundingClientRect()
    setWins((list) =>
      list.map((win) => {
        if (win.id !== id) return win
        const origin =
          screen && icon ? `${icon.left + icon.width / 2 - screen.left - win.x}px ${icon.top - screen.top - win.y}px` : '50% 100%'
        return { ...win, min: true, origin }
      }),
    )
  }

  const zoom = (id: string) => setWins((list) => list.map((win) => (win.id === id ? { ...win, max: !win.max, z: ++zRef.current } : win)))

  useEffect(() => {
    if (!topId) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeWin(topId)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [topId])

  // Dock 放大：按鼠标到每个图标中心的距离（高斯衰减），邻近图标会被推开
  function magnify(event: React.PointerEvent) {
    if (event.pointerType !== 'mouse') return
    products.forEach((product) => {
      const button = iconRefs.current[product.id]
      if (!button) return
      const rect = button.getBoundingClientRect()
      const distance = Math.abs(event.clientX - (rect.left + rect.width / 2))
      const scale = 1 + 0.72 * Math.exp(-(distance * distance) / (2 * 56 * 56))
      button.style.setProperty('--s', scale.toFixed(3))
      button.style.transform = `translateY(${(-(scale - 1) * 6).toFixed(1)}px) scale(${scale.toFixed(3)})`
      button.style.margin = `0 ${((scale - 1) * 20).toFixed(1)}px`
    })
  }

  function resetMagnify() {
    products.forEach((product) => {
      const button = iconRefs.current[product.id]
      if (!button) return
      button.style.removeProperty('--s')
      button.style.transform = ''
      button.style.margin = ''
    })
  }

  // 拖动窗口：标题栏至少留一截在屏幕内
  function startDrag(event: React.PointerEvent, win: Win) {
    if (win.max || (event.target as HTMLElement).closest('button, a')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { id: win.id, startX: event.clientX, startY: event.clientY, baseX: win.x, baseY: win.y }
    setDragging(win.id)
  }

  function moveDrag(event: React.PointerEvent, win: Win) {
    const state = drag.current
    const screen = screenRef.current?.getBoundingClientRect()
    if (!state || state.id !== win.id || !screen) return
    const x = Math.max(120 - win.w, Math.min(screen.width - 120, state.baseX + event.clientX - state.startX))
    const y = Math.max(MENUBAR, Math.min(screen.height - 48, state.baseY + event.clientY - state.startY))
    setWins((list) => list.map((item) => (item.id === win.id ? { ...item, x, y } : item)))
  }

  function endDrag() {
    drag.current = null
    setDragging(null)
  }

  const desc = (product: Product) => (locale === 'en' ? product.descEn : product.desc)
  const menus = MENUS[locale === 'zh' ? 'zh' : 'en']

  return (
    <section className="dk-section" aria-label={translate(locale, 'tabWork')}>
      <div ref={screenRef} className="dk-screen">
        <div className="dk-menubar" aria-hidden="true">
          <AppleIcon />
          <b>{topProduct ? topProduct.name : 'XuYi'}</b>
          <span className="dk-menus">
            {menus.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </span>
          <span className="dk-clock">{clock}</span>
        </div>

        {wins.length === 0 && (
          <div className="dk-hint">
            <strong>{translate(locale, 'dockHint')}</strong>
            <span>{translate(locale, 'dockHintSub')}</span>
          </div>
        )}

        {wins.map((win) => {
          const product = byId(win.id)
          if (!product) return null
          const live = product.embed !== false
          const isTop = win.id === topId
          const shots = product.shots ?? []
          const shot = shots[0] ?? null
          const host = new URL(product.link).host
          return (
            <div
              key={win.id}
              className={`dk-window${live ? ' is-live' : ''}${isTop ? ' is-front' : ''}${win.min ? ' is-min' : ''}${win.max ? ' is-max' : ''}${dragging === win.id ? ' is-dragging' : ''}`}
              role="dialog"
              aria-label={product.name}
              aria-hidden={win.min || undefined}
              style={{ left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z, transformOrigin: win.origin }}
              onPointerDown={() => !isTop && focus(win.id)}
            >
              <div
                className="dk-titlebar"
                onPointerDown={(event) => startDrag(event, win)}
                onPointerMove={(event) => moveDrag(event, win)}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onDoubleClick={(event) => !(event.target as HTMLElement).closest('button, a') && zoom(win.id)}
              >
                <div className="dk-lights">
                  <button type="button" className="dk-light is-close" aria-label={translate(locale, 'closeMenu')} onClick={() => closeWin(win.id)}>
                    <svg viewBox="0 0 8 8" aria-hidden="true"><path d="M1.6 1.6 6.4 6.4M6.4 1.6 1.6 6.4" /></svg>
                  </button>
                  <button type="button" className="dk-light is-min" aria-label="Minimize" onClick={() => minimize(win.id)}>
                    <svg viewBox="0 0 8 8" aria-hidden="true"><path d="M1.4 4h5.2" /></svg>
                  </button>
                  <button type="button" className="dk-light is-zoom" aria-label="Zoom" onClick={() => zoom(win.id)}>
                    <svg viewBox="0 0 8 8" aria-hidden="true"><path d="M1.8 6.2V2.6L5.4 6.2H1.8ZM6.2 1.8v3.6L2.6 1.8h3.6Z" /></svg>
                  </button>
                </div>
                {live ? (
                  <>
                    <span className="dk-url">
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="2.5" y="5.5" width="7" height="5" rx="1.2" /><path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" /></svg>
                      {host}
                    </span>
                    <a className="dk-ext" href={product.link} target="_blank" rel="noreferrer" aria-label={`${ctaLabel(product, locale)} ${product.name}`}>
                      <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3.5 8.5 8.5 3.5M4 3.5h4.5V8" /></svg>
                    </a>
                  </>
                ) : (
                  <span className="dk-title">{product.name}</span>
                )}
              </div>
              {live ? (
                <div className="dk-view">
                  <iframe className="dk-frame" src={product.link} title={product.name} loading="lazy" referrerPolicy="no-referrer" allow="autoplay; fullscreen" />
                  {!isTop && <div className="dk-shield" />}
                </div>
              ) : (
                <div className="dk-body">
                  <div className="dk-media">
                    {shot ? (
                      VIDEO.test(shot) ? (
                        <video src={shot} autoPlay muted loop playsInline />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={shot} alt={`${product.name} screenshot`} />
                      )
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="dk-media-icon" src={product.logo} alt="" />
                    )}
                  </div>
                  <div className="dk-info">
                    <div className="dk-name">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={product.logo} alt="" width={40} height={40} />
                      <h3>{product.name}</h3>
                      {product.badge && <span className="dk-badge">{product.badge}</span>}
                    </div>
                    <p>{desc(product)}</p>
                    <a className="dk-visit" href={product.link} target="_blank" rel="noreferrer">
                      {product.apple && <AppleIcon />}
                      {ctaLabel(product, locale)}
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3.5 8.5 8.5 3.5M4 3.5h4.5V8" /></svg>
                      <span className="pf-sr"> {product.name}</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        <div ref={dockRef} className="dk-dock" role="toolbar" aria-label={translate(locale, 'tabWork')} onPointerMove={magnify} onPointerLeave={resetMagnify}>
          {products.map((product) => {
            const isOpen = wins.some((win) => win.id === product.id)
            return (
              <button
                key={product.id}
                ref={(node) => {
                  iconRefs.current[product.id] = node
                }}
                type="button"
                className={`dk-icon${isOpen ? ' is-open' : ''}${launching === product.id ? ' is-launching' : ''}`}
                aria-label={product.name}
                aria-pressed={isOpen}
                onClick={() => openApp(product.id)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={product.logo} alt="" width={48} height={48} />
                <span className="dk-tip">{product.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 给搜索引擎和读屏软件的纯链接列表（视觉上隐藏） */}
      <ul className="pf-sr">
        {products.map((product) => (
          <li key={product.id}>
            <a href={product.link}>
              {product.name}: {desc(product)}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
