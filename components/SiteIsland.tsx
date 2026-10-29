'use client'

import Link from 'next/link'
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { IslandSearch } from './IslandSearch'
import { LanguageSwitch } from './LanguageSwitch'
import { useLocale } from '@/lib/i18n-client'
import { localePath, localizeNavLabel, t, type Locale } from '@/lib/i18n'
import { ISLAND_SEARCH_EVENT } from '@/lib/island-search'
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
  const { headerLinks } = splitSiteNavLinks(navLinks)
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

  // 友联、日记、简历只放在页脚，岛里只放站点设置里的导航项
  const rest: IslandItem[] = headerLinks.map((link) => {
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
  const [searchOpen, setSearchOpen] = useState(false)
  const [gooOn, setGooOn] = useState(false)
  const [ready, setReady] = useState(false)
  const stackRef = useRef<HTMLDivElement>(null)
  const searchBtnRef = useRef<HTMLButtonElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const compactRef = useRef<HTMLButtonElement>(null)
  const fullRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | undefined>(undefined)
  /** 关掉搜索条后的一小段时间里不因为“鼠标不在岛上”而收起岛（搜索条消失时鼠标刚好落在它原来的位置）。 */
  const holdOpenUntil = useRef(0)

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
    setSearchOpen(false)
  }, [pathname])

  const expanded = open || searchOpen

  // 粘液滤镜会把所有角都磨圆，所以只在搜索条出现（和缩回去的动画）期间启用，平时用清晰的刘海轮廓
  useEffect(() => {
    if (searchOpen) {
      setGooOn(true)
      return
    }
    const timer = window.setTimeout(() => setGooOn(false), 950)
    return () => window.clearTimeout(timer)
  }, [searchOpen])

  /** 打开搜索：先量出搜索图标相对搜索条的位置，让搜索条从图标那里“长”出来。 */
  const openSearch = useCallback(() => {
    const stack = stackRef.current
    const icon = searchBtnRef.current
    if (stack && icon) {
      const s = stack.getBoundingClientRect()
      const i = icon.getBoundingClientRect()
      const barCenterY = s.bottom - 8 + 26
      stack.style.setProperty('--sdx', `${i.left + i.width / 2 - (s.left + s.width / 2)}px`)
      stack.style.setProperty('--sdy', `${i.top + i.height / 2 - barCenterY}px`)
    }
    setOpen(true)
    setSearchOpen(true)
  }, [])

  /** 只关搜索条，岛保持展开（要收起岛时由鼠标移开 / 点外面 / 换页来关）。 */
  const closeSearch = useCallback(() => {
    holdOpenUntil.current = Date.now() + 1800
    window.clearTimeout(closeTimer.current)
    setSearchOpen(false)
    setOpen(true)
  }, [])

  // ⌘K / Ctrl+K 和页面里的“搜索”按钮都走这里
  useEffect(() => {
    const onOpen = () => openSearch()
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        openSearch()
      }
    }
    window.addEventListener(ISLAND_SEARCH_EVENT, onOpen)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener(ISLAND_SEARCH_EVENT, onOpen)
      document.removeEventListener('keydown', onKey)
    }
  }, [openSearch])

  useEffect(() => {
    if (!expanded) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (searchOpen) setSearchOpen(false)
      else setOpen(false)
    }
    const onPointer = (event: PointerEvent) => {
      if (stackRef.current && !stackRef.current.contains(event.target as Node)) {
        setSearchOpen(false)
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [expanded, searchOpen])

  const cancelClose = () => window.clearTimeout(closeTimer.current)
  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = window.setTimeout(() => setOpen(false), Math.max(220, holdOpenUntil.current - Date.now()))
  }

  return (
    <div className="island-root" data-ready={ready ? 'true' : 'false'}>
      {/* 粘液滤镜：模糊后再拉高对比度，相邻的形状会像液体一样连在一起 */}
      <svg className="island-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <filter id="island-goo" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" />
          </filter>
        </defs>
      </svg>

      <div
        ref={stackRef}
        className={`island-stack${expanded ? ' is-open' : ''}${searchOpen ? ' is-searching' : ''}${gooOn ? ' is-goo' : ''}`}
        // 鼠标在岛、搜索条或结果面板上都算“在里面”，这样只关搜索条时岛不会跟着收起
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
        <div className="island-goo" aria-hidden="true">
          <div className="island-shape" />
          <div className="island-bar-shape" />
        </div>
        <div className="island-ears" aria-hidden="true">
          {/* 用矢量路径画凹角，边缘比 CSS 渐变的硬边更平滑 */}
          <svg className="island-ear island-ear-l" viewBox="0 0 1 1" preserveAspectRatio="none" shapeRendering="geometricPrecision" focusable="false">
            <path d="M0 0H1V1Q1 0 0 0Z" />
          </svg>
          <svg className="island-ear island-ear-r" viewBox="0 0 1 1" preserveAspectRatio="none" shapeRendering="geometricPrecision" focusable="false">
            <path d="M0 0H1V1Q1 0 0 0Z" />
          </svg>
        </div>

        <div ref={rootRef} className={`island${expanded ? ' is-open' : ''}`}>
          <button
            ref={compactRef}
            type="button"
            className="island-compact"
            aria-expanded={expanded}
            aria-label={t(locale, expanded ? 'closeMenu' : 'openMenu')}
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

          <div ref={fullRef} className="island-full" inert={!expanded ? true : undefined}>
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
              <button
                ref={searchBtnRef}
                type="button"
                className="island-icon-btn"
                aria-label={t(locale, 'search')}
                title={`${t(locale, 'search')} (⌘K)`}
                aria-expanded={searchOpen}
                onClick={() => (searchOpen ? closeSearch() : openSearch())}
              >
                <Search width={18} height={18} aria-hidden="true" />
              </button>
              <LanguageSwitch />
            </div>
          </div>
        </div>

        <IslandSearch open={searchOpen} onClose={closeSearch} />
      </div>
    </div>
  )
}
