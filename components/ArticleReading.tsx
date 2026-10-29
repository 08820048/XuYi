'use client'

import { useEffect, useRef, useState } from 'react'
import { useT } from '@/lib/i18n-client'

const clamp = (value: number) => Math.min(1, Math.max(0, value))

/** 文章阅读进度：顶部一条细线（末端有蓝色标记，和首页时间线同一种语言）+ 右下角像素字百分比，点它回到顶部。 */
export function ReadingProgress({ containerId }: { containerId: string }) {
  const { t } = useT()
  const [progress, setProgress] = useState(0)
  const frame = useRef(0)

  useEffect(() => {
    const update = () => {
      frame.current = 0
      const el = document.getElementById(containerId)
      if (!el) return
      const rect = el.getBoundingClientRect()
      const top = rect.top + window.scrollY
      setProgress(clamp((window.scrollY + window.innerHeight * 0.6 - top) / Math.max(rect.height, 1)))
    }
    const onScroll = () => {
      if (!frame.current) frame.current = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [containerId])

  const percent = Math.round(progress * 100)

  return (
    <>
      <div className="ar-bar" role="progressbar" aria-label={t('readProgress')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <i style={{ width: `${percent}%` }} />
      </div>
      <button
        type="button"
        className={`ar-readout${progress > 0.02 ? ' is-visible' : ''}`}
        aria-label={`${t('footTop')} (${percent}%)`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <span>{String(percent).padStart(2, '0')}%</span>
        <b aria-hidden="true">↑</b>
      </button>
    </>
  )
}

/**
 * 正文细节：代码块（语言标签 + 一键复制）、表格横向滚动、点击图片放大、标题悬停出现锚点。
 * 都是直接对已渲染的 HTML 做增强，不改变正文内容本身。
 */
export function ArticleEnhancements({ containerId, html }: { containerId: string; html: string }) {
  const { t } = useT()
  const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null)

  useEffect(() => {
    const root = document.getElementById(containerId)
    if (!root) return

    // 代码块
    root.querySelectorAll<HTMLElement>('pre').forEach((pre) => {
      if (pre.dataset.tools === 'yes') return
      if (pre.matches('.mermaid, .kami-diagram') || pre.closest('.math-block-wrapper, .katex, .kami-diagram')) return
      const code = pre.querySelector('code')
      if (!code) return
      pre.dataset.tools = 'yes'
      const lang =
        pre.getAttribute('data-language') ||
        /language-([\w+#-]+)/.exec(`${pre.className} ${code.className}`)?.[1] ||
        ''
      const tools = document.createElement('div')
      tools.className = 'code-tools'
      if (lang && lang !== 'plaintext' && lang !== 'text') {
        const label = document.createElement('span')
        label.textContent = lang
        tools.append(label)
      }
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = t('copyCode')
      button.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(code.textContent ?? '')
        } catch {
          return
        }
        button.textContent = `${t('copied')} ✓`
        button.dataset.done = 'yes'
        window.setTimeout(() => {
          button.textContent = t('copyCode')
          delete button.dataset.done
        }, 1600)
      })
      tools.append(button)
      pre.append(tools)
    })

    // 表格：包一层可横向滚动的容器
    root.querySelectorAll<HTMLTableElement>('table').forEach((table) => {
      if (table.parentElement?.classList.contains('table-scroll')) return
      const wrap = document.createElement('div')
      wrap.className = 'table-scroll'
      table.replaceWith(wrap)
      wrap.append(table)
    })

    // 标题锚点（标题 id 由目录组件在稍后补齐）
    const timer = window.setTimeout(() => {
      root.querySelectorAll<HTMLHeadingElement>('h2[id], h3[id]').forEach((heading) => {
        if (heading.querySelector('.heading-anchor')) return
        const anchor = document.createElement('a')
        anchor.className = 'heading-anchor'
        anchor.href = `#${heading.id}`
        anchor.setAttribute('aria-label', heading.textContent ?? '')
        anchor.textContent = '#'
        heading.append(anchor)
      })
    }, 400)

    // 图片点击放大
    const onClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof HTMLImageElement) || target.closest('a')) return
      if (target.closest('.katex, .kami-diagram, .math-block-wrapper')) return
      setZoom({ src: target.currentSrc || target.src, alt: target.alt })
    }
    root.addEventListener('click', onClick)
    root.querySelectorAll('img').forEach((img) => {
      if (!img.closest('a')) img.classList.add('is-zoomable')
    })

    return () => {
      window.clearTimeout(timer)
      root.removeEventListener('click', onClick)
    }
  }, [containerId, html, t])

  useEffect(() => {
    if (!zoom) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoom(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [zoom])

  if (!zoom) return null
  return (
    <div className="ar-zoom" role="dialog" aria-modal="true" aria-label={t('zoomImage')} onClick={() => setZoom(null)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={zoom.src} alt={zoom.alt} />
    </div>
  )
}
