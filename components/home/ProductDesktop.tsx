'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { t as translate, type Locale } from '@/lib/i18n'
import { useLocale } from '@/lib/i18n-client'
import { freeProject, projects, type Product } from '@/lib/portfolio'
import { AppleIcon } from './icons'

const VIDEO = /\.(mp4|webm|mov)$/i

function ctaLabel(product: Product, locale: Locale) {
  if (locale === 'zh') return product.cta.replace(/\s*→\s*$/, '')
  if (product.cta.includes('购买')) return translate(locale, 'buy')
  return translate(locale, 'visit')
}

/**
 * 产品展示做成一块“Mac 桌面”：底部是 Dock（鼠标靠近时图标按距离放大），
 * 点一个图标就像启动应用一样弹出一个窗口，里面是截图 / 录屏、简介和访问入口。窗口可以拖动，Esc 或红色圆点关闭。
 */
export function ProductDesktop() {
  const locale = useLocale()
  const products = [...freeProject, ...projects]
  const [openId, setOpenId] = useState<string | null>(null)
  const [shotIndex, setShotIndex] = useState(0)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const screenRef = useRef<HTMLDivElement>(null)
  const windowRef = useRef<HTMLDivElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  const iconRefs = useRef<Array<HTMLButtonElement | null>>([])
  const drag = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null)

  const active = products.find((product) => product.id === openId) ?? null

  const open = useCallback((id: string) => {
    setOpenId((current) => (current === id ? null : id))
    setShotIndex(0)
    setOffset({ x: 0, y: 0 })
  }, [])

  const close = useCallback(() => setOpenId(null), [])

  useEffect(() => {
    if (!openId) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenId(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [openId])

  // Dock 放大：按鼠标到每个图标中心的距离（高斯衰减），邻近图标会被推开
  function magnify(event: React.PointerEvent) {
    if (event.pointerType !== 'mouse') return
    iconRefs.current.forEach((button) => {
      if (!button) return
      const rect = button.getBoundingClientRect()
      const distance = Math.abs(event.clientX - (rect.left + rect.width / 2))
      const scale = 1 + 0.72 * Math.exp(-(distance * distance) / (2 * 56 * 56))
      button.style.transform = `translateY(${(-(scale - 1) * 6).toFixed(1)}px) scale(${scale.toFixed(3)})`
      button.style.margin = `0 ${((scale - 1) * 20).toFixed(1)}px`
    })
  }

  function resetMagnify() {
    iconRefs.current.forEach((button) => {
      if (!button) return
      button.style.transform = ''
      button.style.margin = ''
    })
  }

  // 拖动窗口：只能在“屏幕”范围内拖，标题栏始终留在里面
  function startDrag(event: React.PointerEvent) {
    if ((event.target as HTMLElement).closest('button, a')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { startX: event.clientX, startY: event.clientY, baseX: offset.x, baseY: offset.y }
  }

  function moveDrag(event: React.PointerEvent) {
    const state = drag.current
    const screen = screenRef.current?.getBoundingClientRect()
    const win = windowRef.current?.getBoundingClientRect()
    if (!state || !screen || !win) return
    let x = state.baseX + event.clientX - state.startX
    let y = state.baseY + event.clientY - state.startY
    const slackX = Math.max(0, (screen.width - win.width) / 2)
    const slackY = Math.max(0, (screen.height - win.height) / 2)
    x = Math.max(-slackX, Math.min(slackX, x))
    y = Math.max(-slackY + 8, Math.min(slackY, y))
    setOffset({ x, y })
  }

  function endDrag() {
    drag.current = null
  }

  const desc = (product: Product) => (locale === 'en' ? product.descEn : product.desc)
  const live = !!active && active.embed !== false
  const host = active ? new URL(active.link).host : ''
  const shots = active?.shots ?? []
  const shot = shots[shotIndex] ?? null

  return (
    <section className="dk-section" aria-label={translate(locale, 'tabWork')}>
      <div ref={screenRef} className="dk-screen">
        {!active && (
          <div className="dk-hint">
            <strong>{translate(locale, 'dockHint')}</strong>
            <span>{translate(locale, 'dockHintSub')}</span>
          </div>
        )}

        {active && (
          <div
            key={active.id}
            ref={windowRef}
            className={`dk-window${live ? ' is-live' : ''}`}
            role="dialog"
            aria-label={active.name}
            style={{ ['--dx' as string]: `${offset.x}px`, ['--dy' as string]: `${offset.y}px` }}
          >
            <div className="dk-titlebar" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
              <button type="button" className="dk-close" aria-label={translate(locale, 'closeMenu')} onClick={close} />
              <i aria-hidden="true" />
              <i aria-hidden="true" />
              {live ? (
                <>
                  <span className="dk-url">{host}</span>
                  <a className="dk-ext" href={active.link} target="_blank" rel="noreferrer" aria-label={`${ctaLabel(active, locale)} ${active.name}`}>
                    <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3.5 8.5 8.5 3.5M4 3.5h4.5V8" />
                    </svg>
                  </a>
                </>
              ) : (
                <span>{active.name}</span>
              )}
            </div>
            {live ? (
              <iframe
                className="dk-frame"
                src={active.link}
                title={active.name}
                loading="lazy"
                referrerPolicy="no-referrer"
                allow="autoplay; fullscreen"
              />
            ) : (
            <div className="dk-body">
              <div className="dk-media">
                {shot ? (
                  VIDEO.test(shot) ? (
                    <video key={shot} src={shot} autoPlay muted loop playsInline />
                  ) : (
                    <img key={shot} src={shot} alt={`${active.name} screenshot ${shotIndex + 1}`} />
                  )
                ) : (
                  <img className="dk-media-icon" src={active.logo} alt="" />
                )}
                {shots.length > 1 && (
                  <div className="dk-dots" role="tablist" aria-label="Screenshots">
                    {shots.map((item, index) => (
                      <button
                        key={item}
                        type="button"
                        role="tab"
                        aria-selected={index === shotIndex}
                        aria-label={`${index + 1} / ${shots.length}`}
                        onClick={() => setShotIndex(index)}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="dk-info">
                <div className="dk-name">
                  <img src={active.logo} alt="" width={40} height={40} />
                  <h3>{active.name}</h3>
                  {active.badge && <span className="dk-badge">{active.badge}</span>}
                </div>
                <p>{desc(active)}</p>
                <a className="dk-visit" href={active.link} target="_blank" rel="noreferrer">
                  {active.apple && <AppleIcon />}
                  {ctaLabel(active, locale)}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3.5 8.5 8.5 3.5M4 3.5h4.5V8" />
                  </svg>
                  <span className="pf-sr"> {active.name}</span>
                </a>
              </div>
            </div>
            )}
          </div>
        )}

        <div ref={dockRef} className="dk-dock" role="toolbar" aria-label={translate(locale, 'tabWork')} onPointerMove={magnify} onPointerLeave={resetMagnify}>
          {products.map((product, index) => (
            <button
              key={product.id}
              ref={(node) => {
                iconRefs.current[index] = node
              }}
              type="button"
              className={`dk-icon${openId === product.id ? ' is-open' : ''}`}
              aria-label={product.name}
              aria-pressed={openId === product.id}
              onClick={() => open(product.id)}
            >
              <img src={product.logo} alt="" width={48} height={48} />
              <span className="dk-tip">{product.name}</span>
            </button>
          ))}
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
