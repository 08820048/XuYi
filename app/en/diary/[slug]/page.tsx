import { DiaryEntryView, buildDiaryMetadata } from '@/components/pages/DiaryEntryView'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return buildDiaryMetadata(slug, 'en')
}

export default async function EnglishDiaryEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <DiaryEntryView slug={slug} lang="en" />
}
