'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  getHomeLayout,
  setHomeLayout,
  subscribeHomeLayout,
  type HomeLayout,
} from '@/lib/home-layout'

const OPTIONS: { id: HomeLayout; label: string }[] = [
  { id: 'shelf', label: '书架' },
  { id: 'list', label: '列表' },
]

export function HomeLayoutMenu({
  inline = false,
  initialLayout = 'shelf',
  onSelect,
}: {
  inline?: boolean
  initialLayout?: HomeLayout
  onSelect?: () => void
}) {
  const layout = useSyncExternalStore(
    subscribeHomeLayout,
    getHomeLayout,
    () => initialLayout,
  )
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (inline) return
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [inline])

  const choose = (next: HomeLayout) => {
    setHomeLayout(next)
    setOpen(false)
    onSelect?.()
  }

  if (inline) {
    return (
      <div className="home-layout-inline" role="group" aria-label="主题">
        <span className="site-nav-link">主题</span>
        {OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`home-layout-menu-item${layout === option.id ? ' is-on' : ''}`}
            aria-pressed={layout === option.id}
            onClick={() => choose(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="home-layout-menu" ref={ref}>
      <button
        type="button"
        className="site-nav-link home-layout-menu-button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        主题
        <ChevronDown size={13} className={open ? 'is-open' : undefined} />
      </button>
      {open && (
        <div className="home-layout-menu-panel" role="menu" aria-label="主题">
          {OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="menuitemradio"
              aria-checked={layout === option.id}
              className={`home-layout-menu-item${layout === option.id ? ' is-on' : ''}`}
              onClick={() => choose(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
