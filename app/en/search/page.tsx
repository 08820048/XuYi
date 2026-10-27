import { SearchView } from '@/components/pages/SearchView'

export const metadata = {
  title: 'Search results',
  robots: { index: false, follow: true },
}

export default async function EnglishSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  return <SearchView q={q} lang="en" />
}
