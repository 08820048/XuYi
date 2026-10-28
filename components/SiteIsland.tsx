'use client'

import Link from 'next/link'
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { SearchEntry } from './SearchEntry'
import { LanguageSwitch } from './LanguageSwitch'
import { useLocale } from '@/lib/i18n-client'
import { localePath, localizeNavLabel, t, type Locale } from '@/lib/i18n'
import { profile } from '@/lib/portfolio'
import { splitSiteNavLinks, type SiteNavLink } from '@/lib/site'
import '@/app/island.css'

interface IslandItem {
  key: string
  label: string
  href: string
  external: boolean
  newTab: boolean
  active: boolean
}

function stripLocale(pathname: string) {
  const path = pathname.replace(/^\/en(?=\/|$)/, '')
  return path === '' ? '/' : path
}

/** 灵动岛收起状态里显示的“现在在哪一页”。 */
function contextLabel(locale: Locale, pathname: string, tab: string | null) {
  const path = stripLocale(pathname)
  if (path === '/') return t(locale, tab === 'blog' ? 'tabWriting' : 'tabWork')
  if (path.startsWith('/diary')) return t(locale, 'diaryTitle')
  if (path.startsWith('/links')) return t(locale, 'linksTitle')
  if (path.startsWith('/about')) return localizeNavLabel('关于我', locale)
  if (path.startsWith('/search')) return t(locale, 'searchResults')
  return t(locale, 'articleKicker')
}

function IslandContext({ locale, pathname }: { locale: Locale; pathname: string }) {
  const tab = useSearchParams().get('tab')
  return <>{contextLabel(locale, pathname, tab)}</>
}

function useIslandItems(navLinks: SiteNavLink[] | undefined, locale: Locale, pathname: string, tab: string | null) {
  const { headerLinks, footerLinks } = splitSiteNavLinks(navLinks)
  const path = stripLocale(pathname)
  const onHome = path === '/'

  const core: IslandItem[] = [
    {
      key: 'work',
      label: t(locale, 'tabWork'),
      href: localePath('/', locale),
      external: false,
      newTab: false,
      active: onHome && tab !== 'blog',
    },
    {
      key: 'writing',
      label: t(locale, 'tabWriting'),
      href: localePath('/?tab=blog', locale),
      external: false,
      newTab: false,
      active: onHome && tab === 'blog',
    },
  ]

  // 友联、日记原本放在页脚，这里一并放进岛里；“简历”继续只留在页脚
  const extra = [...headerLinks, ...footerLinks.filter((link) => navPathOf(link) !== null && link.label.trim() !== '简历')]
  const rest: IslandItem[] = extra.map((link) => {
    const external = link.url.startsWith('http') || link.url.startsWith('//')
    const href = external ? link.url : localePath(link.url, locale)
    const target = stripLocale(link.url.split('?')[0].split('#')[0]) || '/'
    return {
      key: `${link.label}|${link.url}`,
      label: localizeNavLabel(link.label, locale),
      href,
      external,
      newTab: link.openInNewTab,
      active: !external && target !== '/' && (path === target || path.startsWith(`${target}/`)),
    }
  })

  return [...core, ...rest]
}

function navPathOf(link: SiteNavLink) {
  return link.url || null
}

function IslandNavLinks({
  navLinks,
  locale,
  pathname,
  tab,
  onNavigate,
}: {
  navLinks: SiteNavLink[] | undefined
  locale: Locale
  pathname: string
  tab: string | null
  onNavigate: () => void
}) {
  const items = useIslandItems(navLinks, locale, pathname, tab)
  return (
    <>
      {items.map((item) =>
        item.external ? (
          <a
            key={item.key}
            href={item.href}
            className={item.active ? 'is-current' : undefined}
            target={item.newTab ? '_blank' : undefined}
            rel={item.newTab ? 'noopener noreferrer' : undefined}
            onClick={onNavigate}
          >
            {item.label}
          </a>
        ) : (
          <Link key={item.key} href={item.href} className={item.active ? 'is-current' : undefined} onClick={onNavigate}>
            {item.label}
          </Link>
        ),
      )}
    </>
  )
}

function IslandNavWithTab(props: Omit<Parameters<typeof IslandNavLinks>[0], 'tab'>) {
  const tab = useSearchParams().get('tab')
  return <IslandNavLinks {...props} tab={tab} />
}

export function SiteIsland({ navLinks }: { navLinks?: SiteNavLink[] }) {
  const locale = useLocale()
  const pathname = usePathname() || '/'
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const compactRef = useRef<HTMLButtonElement>(null)
  const fullRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | undefined>(undefined)

  const measure = useCallback(() => {
    const root = rootRef.current
    if (!root) return
    if (compactRef.current) root.style.setProperty('--island-closed-w', `${compactRef.current.offsetWidth}px`)
    if (fullRef.current) root.style.setProperty('--island-open-h', `${fullRef.current.offsetHeight}px`)
  }, [])

  useLayoutEffect(() => {
    measure()
    setReady(true)
    const observer = new ResizeObserver(measure)
    if (compactRef.current) observer.observe(compactRef.current)
    if (fullRef.current) observer.observe(fullRef.current)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure, locale])

  // 换页后自动收起
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onPointer = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  const cancelClose = () => window.clearTimeout(closeTimer.current)
  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = window.setTimeout(() => setOpen(false), 220)
  }

  return (
    <div className="island-root" data-ready={ready ? 'true' : 'false'}>
      <div
        ref={rootRef}
        className={`island${open ? ' is-open' : ''}`}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') {
            cancelClose()
            setOpen(true)
          }
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse') scheduleClose()
        }}
      >
        <button
          ref={compactRef}
          type="button"
          className="island-compact"
          aria-expanded={open}
          aria-label={t(locale, open ? 'closeMenu' : 'openMenu')}
          onClick={() => setOpen((value) => !value)}
        >
          <img className="island-avatar" src={profile.avatar} alt="" width={24} height={24} />
          <span className="island-name">XuYi</span>
          <span className="island-ctx">
            <Suspense fallback={contextLabel(locale, pathname, null)}>
              <IslandContext locale={locale} pathname={pathname} />
            </Suspense>
          </span>
        </button>

        <div ref={fullRef} className="island-full" inert={!open ? true : undefined}>
          <Link
            href={localePath('/', locale)}
            className="island-brand"
            aria-label={t(locale, 'backHome')}
            onClick={() => setOpen(false)}
          >
            <img className="island-avatar" src={profile.avatar} alt="" width={30} height={30} />
            <span className="island-wordmark">
              Xu<i>Yi</i>
            </span>
          </Link>

          <nav className="island-nav" aria-label="Main">
            <Suspense
              fallback={
                <IslandNavLinks navLinks={navLinks} locale={locale} pathname={pathname} tab={null} onNavigate={() => setOpen(false)} />
              }
            >
              <IslandNavWithTab navLinks={navLinks} locale={locale} pathname={pathname} onNavigate={() => setOpen(false)} />
            </Suspense>
          </nav>

          <div className="island-actions">
            <SearchEntry />
            <LanguageSwitch />
          </div>
        </div>
      </div>
    </div>
  )
}
