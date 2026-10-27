import { DiaryListView } from '@/components/pages/DiaryListView'
import { getSiteUrl } from '@/lib/site-config'

export const metadata = {
  title: 'Diary',
  alternates: {
    canonical: `${getSiteUrl()}/en/diary`,
  },
}

export default async function EnglishDiaryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page } = await searchParams
  return <DiaryListView page={page} lang="en" />
}
