'use client'

import { useSyncExternalStore } from 'react'
import type { Theme } from '@/lib/appearance'
import type { PostWithTags } from '@/lib/db'
import type { SiteCategoryLink, SiteNavLink } from '@/lib/site'
import { getHomeLayout, subscribeHomeLayout, type HomeLayout } from '@/lib/home-layout'
import { HomeVariantA } from '@/components/themes/HomeVariantA'
import { HomeList } from '@/components/themes/HomeList'

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
}

export function HomeClient(props: HomeProps) {
  const layout = useSyncExternalStore(
    subscribeHomeLayout,
    getHomeLayout,
    () => props.initialHomeLayout ?? 'shelf',
  )
  if (layout === 'list') return <HomeList {...props} />
  return <HomeVariantA {...props} />
}
