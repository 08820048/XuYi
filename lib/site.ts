import type { Theme } from '@/lib/appearance'
import { getPublicCategories, getSetting } from '@/lib/db'

export interface SiteNavLink {
  label: string
  url: string
  openInNewTab: boolean
}

export interface SiteCategoryLink {
  name: string
  slug: string
}

export const defaultSiteNavLinks: SiteNavLink[] = [
  { label: 'GitHub', url: 'https://github.com/08820048/XuYi-Blog', openInNewTab: true },
  { label: '关于我', url: '/about', openInNewTab: false },
  { label: '友联', url: '/links', openInNewTab: false },
  { label: 'RSS', url: '/feed.xml', openInNewTab: false },
]

function navPath(url: string) {
  if (url.startsWith('http') || url.startsWith('//')) return url
  const path = url.split('?')[0].split('#')[0]
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1)
  return path || '/'
}

function linkHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** 友联、简历、日记固定放在页脚，顺序也按这个来。 */
function footerRank(link: SiteNavLink): number | null {
  const path = navPath(link.url)
  if (path === '/links') return 0
  if (link.label.trim() === '简历' || linkHost(link.url) === 'chupin.site') return 1
  if (path === '/diary') return 2
  return null
}

export function splitSiteNavLinks(links: SiteNavLink[] | undefined): {
  headerLinks: SiteNavLink[]
  footerLinks: SiteNavLink[]
} {
  const source = links && links.length > 0 ? links : defaultSiteNavLinks
  const headerLinks: SiteNavLink[] = []
  const footerLinks: SiteNavLink[] = []

  for (const link of source) {
    if (footerRank(link) === null) headerLinks.push(link)
    else footerLinks.push(link)
  }

  footerLinks.sort((a, b) => (footerRank(a) ?? 0) - (footerRank(b) ?? 0))

  return { headerLinks, footerLinks }
}

export async function getSiteHeaderData(db: D1Database): Promise<{
  navLinks: SiteNavLink[]
  categories: SiteCategoryLink[]
  defaultTheme: Theme
}> {
  let navLinks: SiteNavLink[] = []
  let categories: SiteCategoryLink[] = []
  const defaultTheme: Theme = 'kami'

  try {
    const [navJson, categoryRows, diaryNavEnabled] = await Promise.all([
      getSetting(db, 'nav_links'),
      getPublicCategories(db),
      getSetting(db, 'diary_nav_enabled'),
    ])

    if (navJson) {
      try {
        const parsed = JSON.parse(navJson)
        if (Array.isArray(parsed)) {
          navLinks = parsed
        }
      } catch {}
    }

    const effectiveNavLinks = navLinks.length > 0 ? navLinks : defaultSiteNavLinks
    if (diaryNavEnabled === 'true' && !effectiveNavLinks.some((link) => link.url === '/diary')) {
      navLinks = [
        ...effectiveNavLinks,
        { label: '日记', url: '/diary', openInNewTab: false },
      ]
    }

    categories = categoryRows
      .filter((category) => category.slug && category.name && category.name !== '未分类')
      .map((category) => ({
        name: category.name,
        slug: category.slug,
      }))
  } catch {
    // Keep graceful fallback behavior for public pages
  }
  return { navLinks, categories, defaultTheme }
}
