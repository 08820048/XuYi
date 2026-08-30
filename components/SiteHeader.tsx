'use client'

import Link from 'next/link'
import { useState } from 'react'
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
}

export function SiteHeader({
  navLinks,
  stickyOnMobile = true,
}: SiteHeaderProps) {
  const links = navLinks && navLinks.length > 0 ? navLinks : defaultSiteNavLinks
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const renderLink = (link: NavLink, onClick?: () => void) => {
    const className = 'site-nav-link'

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
    <header className={`site-header ${stickyOnMobile ? 'sticky' : 'sm:sticky'} top-0 z-40`}>
      <div className="site-header-inner mx-auto">
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
            <nav className="site-nav hidden sm:flex items-center flex-shrink-0">
              {links.map(link => renderLink(link))}
              <SearchEntry />
            </nav>

            {/* Mobile: search icon + hamburger */}
            <div className="sm:hidden flex items-center gap-1">
              <SearchEntry />
              <button
                className="site-nav-action"
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
        <div className="site-mobile-menu">
          <nav className="flex flex-col gap-1 px-4 pb-3 text-sm">
            {links.map(link => (
              <div key={link.label} className="site-mobile-nav-item">
                {renderLink(link, () => setMobileMenuOpen(false))}
              </div>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
