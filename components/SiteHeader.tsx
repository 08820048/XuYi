'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { SearchEntry } from './SearchEntry'
import { LanguageSwitch } from './LanguageSwitch'
import { useLocale } from '@/lib/i18n-client'
import { localePath, localizeNavLabel, t } from '@/lib/i18n'
import { splitSiteNavLinks, type SiteNavLink } from '@/lib/site'

export type NavLink = SiteNavLink

interface SiteHeaderProps {
  navLinks?: NavLink[]
  stickyOnMobile?: boolean
}

export function SiteHeader({
  navLinks,
  stickyOnMobile = true,
}: SiteHeaderProps) {
  const { headerLinks: links } = splitSiteNavLinks(navLinks)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const locale = useLocale()

  const isActive = (url: string) => {
    if (url.startsWith('http') || url.startsWith('//')) return false
    const target = localePath(url, locale)
    if (url === '/') return pathname === target
    return pathname === target || pathname.startsWith(`${target}/`)
  }

  const renderLink = (link: NavLink, onClick?: () => void) => {
    const className = `site-nav-link${isActive(link.url) ? ' is-active' : ''}`
    const label = localizeNavLabel(link.label, locale)

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
          {label}
        </a>
      )
    }

    return (
      <Link
        key={link.label}
        href={localePath(link.url, locale)}
        className={className}
        onClick={onClick}
      >
        {label}
      </Link>
    )
  }

  return (
    <header className={`site-header ${stickyOnMobile ? 'sticky' : 'sm:sticky'} top-0 z-40`}>
      <div className="site-header-inner mx-auto">
        <div className="site-header-row h-14 flex items-center justify-between gap-4">
          <div className="site-header-primary min-w-0 flex items-center">
            <Link
              href={localePath('/', locale)}
              className="site-logo-link transition-opacity duration-200 hover:opacity-75"
              aria-label={t(locale, 'backHome')}
            >
              <span className="sv-wordmark" aria-hidden="true">
                <span>Xu</span>
                <span>Yi</span>
              </span>
            </Link>
          </div>

          <div className="site-header-secondary flex flex-shrink-0 items-center justify-end gap-1">
            {/* Desktop nav */}
            <nav className="site-nav hidden sm:flex items-center flex-shrink-0">
              {links.map(link => renderLink(link))}
              <LanguageSwitch className="site-nav-link" />
              <SearchEntry />
            </nav>

            {/* Mobile: search icon + hamburger */}
            <div className="sm:hidden flex items-center gap-1">
              <LanguageSwitch className="site-nav-action" />
              <SearchEntry />
              <button
                className="site-nav-action"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? t(locale, 'closeMenu') : t(locale, 'openMenu')}
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
          <nav className="site-mobile-nav flex flex-col gap-1 pb-3 text-sm">
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
