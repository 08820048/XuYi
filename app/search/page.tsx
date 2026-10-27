import { SearchView } from '@/components/pages/SearchView'

export const metadata = {
  title: '搜索结果',
  robots: { index: false, follow: true },
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  return <SearchView q={q} />
}
