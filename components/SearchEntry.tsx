'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { useT } from '@/lib/i18n-client'
import { localePath } from '@/lib/i18n'

const SearchBar = dynamic(
  () => import('@/components/SearchBar').then((module) => module.SearchBar),
  {
    ssr: false,
    loading: () => <SearchFallback />,
  },
)

function SearchFallback() {
  const { locale, t } = useT()
  return (
    <Link
      href={localePath('/search', locale)}
      className="site-nav-action"
      aria-label={t('search')}
      title={t('search')}
    >
      <Search className="w-[18px] h-[18px]" />
    </Link>
  )
}

export function SearchEntry() {
  return <SearchBar />
}
