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

export async function getSiteHeaderData(db: D1Database): Promise<{
  navLinks: SiteNavLink[]
  categories: SiteCategoryLink[]
  defaultTheme: Theme
}> {
  let navLinks: SiteNavLink[] = []
  let categories: SiteCategoryLink[] = []
  const defaultTheme: Theme = 'refined'

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
