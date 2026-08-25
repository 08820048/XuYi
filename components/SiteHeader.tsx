'use client'

import Link from 'next/link'
import { useState, useEffect, type CSSProperties } from 'react'
import { Menu, X } from 'lucide-react'
import { SearchEntry } from './SearchEntry'
import type { Theme } from '@/lib/appearance'
import { defaultSiteNavLinks, type SiteNavLink } from '@/lib/site'
import { SignatureLogo } from '@/components/SignatureLogo'

export type NavLink = SiteNavLink

interface SiteHeaderProps {
  navLinks?: NavLink[]
  stickyOnMobile?: boolean
  initialTheme?: Theme
  forceSpread?: boolean
}

export function SiteHeader({
  navLinks,
  stickyOnMobile = true,
  forceSpread = false,
}: SiteHeaderProps) {
  const links = navLinks && navLinks.length > 0 ? navLinks : defaultSiteNavLinks
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [spreadProgress, setSpreadProgress] = useState(forceSpread ? 1 : 0)

  useEffect(() => {
    if (forceSpread) {
      return
    }

    let frame = 0
    const scrollRange = 220
    const syncProgress = () => {
      frame = 0
      setSpreadProgress(Math.max(0, Math.min(window.scrollY / scrollRange, 1)))
    }
    const scheduleSync = () => {
      if (frame) return
      frame = window.requestAnimationFrame(syncProgress)
    }

    syncProgress()
    window.addEventListener('scroll', scheduleSync, { passive: true })
    window.addEventListener('resize', scheduleSync)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', scheduleSync)
      window.removeEventListener('resize', scheduleSync)
    }
  }, [forceSpread])

  const effectiveSpreadProgress = forceSpread ? 1 : spreadProgress
  const spreadStyle = {
    '--site-header-spread-progress': effectiveSpreadProgress.toFixed(3),
  } as CSSProperties

  const renderLink = (link: NavLink, onClick?: () => void) => {
    const className = "text-[var(--editor-muted)] hover:text-[var(--editor-ink)] transition-colors duration-150"

    if (link.openInNewTab || link.url.startsWith('http')) {
      return (
        <a
          key={link.label}
          href={link.url}
          target={link.openInNewTab ? '_blank' : undefined}
          rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
          className={className}
          onClick={onClick}
        >
          {link.label}
        </a>
      )
    }

    return (
      <Link
        key={link.label}
        href={link.url}
        className={className}
        onClick={onClick}
      >
        {link.label}
      </Link>
    )
  }

  return (
    <header className={`site-header ${stickyOnMobile ? 'sticky' : 'sm:sticky'} top-0 z-40 bg-[var(--background)]/95 backdrop-blur-sm`}>
      <div className="site-header-inner mx-auto max-w-3xl px-4 sm:px-6" style={spreadStyle}>
        <div className="site-header-row h-14 flex items-center justify-between gap-4">
          <div className="site-header-primary min-w-0 flex items-center">
            <Link
              href="/"
              className="site-logo-link transition-opacity duration-200 hover:opacity-75"
              aria-label="返回首页"
            >
              <SignatureLogo />
            </Link>
          </div>

          <div className="site-header-secondary flex flex-shrink-0 items-center justify-end gap-1">
            {/* Desktop nav */}
            <nav className="hidden sm:flex items-center gap-3 text-sm flex-shrink-0">
              {links.map(link => renderLink(link))}
              <SearchEntry />
            </nav>

            {/* Mobile: search icon + hamburger */}
            <div className="sm:hidden flex items-center gap-1">
              <SearchEntry />
              <button
                className="p-2 text-[var(--editor-muted)] hover:text-[var(--editor-ink)] transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? '关闭菜单' : '打开菜单'}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      <div
        className={`
          sm:hidden transition-all duration-300 ease-in-out
          ${mobileMenuOpen ? 'max-h-[70vh] overflow-visible' : 'max-h-0 overflow-hidden'}
        `}
      >
        <div className="bg-[var(--background)]">
          <nav className="flex flex-col gap-1 px-4 pb-3 text-sm">
            {links.map(link => (
              <div key={link.label} className="bg-[var(--editor-soft)] px-3 py-2.5">
                {renderLink(link, () => setMobileMenuOpen(false))}
              </div>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
