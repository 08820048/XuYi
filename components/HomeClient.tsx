'use client'

import type { Theme } from '@/lib/appearance'
import type { PostWithTags } from '@/lib/db'
import type { SiteCategoryLink, SiteNavLink } from '@/lib/site'
import type { HomeLayout } from '@/lib/home-layout'
import { PortfolioHome, type HomeTab } from '@/components/home/PortfolioHome'

export type { Theme }

export interface DiaryShelfEntry {
  slug: string
  title: string | null
  published_at: number
}

export interface HomeProps {
  initialTheme: Theme
  posts: PostWithTags[]
  categories: SiteCategoryLink[]
  navLinks: SiteNavLink[]
  currentPage: number
  totalPages: number
  categorySlugMap: Record<string, string>
  diaryEntries?: DiaryShelfEntry[]
  initialHomeLayout?: HomeLayout
  initialTab?: HomeTab
}

export function HomeClient({
  posts,
  currentPage,
  totalPages,
  initialTab = 'work',
}: HomeProps) {
  return (
    <PortfolioHome
      posts={posts}
      currentPage={currentPage}
      totalPages={totalPages}
      initialTab={initialTab}
    />
  )
}
