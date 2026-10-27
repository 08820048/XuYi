import { PostView, buildPostMetadata } from '@/components/pages/PostView'

// Cloudflare Workers 缓存策略
export const revalidate = 86400 // 24小时缓存
export const dynamicParams = true

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return buildPostMetadata(slug)
}

export default async function PostPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ pwd?: string }>
}) {
  const { slug } = await params
  const { pwd } = await searchParams
  return <PostView slug={slug} pwd={pwd} />
}
