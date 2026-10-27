import { DiaryListView } from '@/components/pages/DiaryListView'
import { getSiteUrl } from '@/lib/site-config'

export const metadata = {
  title: '日记',
  alternates: {
    canonical: `${getSiteUrl()}/diary`,
  },
}

export default async function DiaryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page } = await searchParams
  return <DiaryListView page={page} />
}
