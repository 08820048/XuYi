import { DiaryEntryView, buildDiaryMetadata } from '@/components/pages/DiaryEntryView'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return buildDiaryMetadata(slug)
}

export default async function DiaryEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <DiaryEntryView slug={slug} />
}
