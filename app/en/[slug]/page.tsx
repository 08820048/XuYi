import { PostView, buildPostMetadata } from '@/components/pages/PostView'

export const revalidate = 86400
export const dynamicParams = true

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ preview?: string }>
}) {
  const { slug } = await params
  const { preview } = await searchParams
  return buildPostMetadata(slug, 'en', Boolean(preview))
}

export default async function EnglishPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ preview?: string }>
}) {
  const { slug } = await params
  const { preview } = await searchParams
  return <PostView slug={slug} lang="en" preview={Boolean(preview)} />
}
