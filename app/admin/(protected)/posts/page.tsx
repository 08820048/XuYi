import { getPosts, searchPosts, getCategories, getPostTranslationSummaries, getCurrentSourceHashes } from '@/lib/db'
import { getTranslationFreshness } from '@/lib/translation-hash'
import { getAppCloudflareEnv } from '@/lib/cloudflare'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PostRow } from './PostRow'
import type { TranslationInfo } from './TranslationControl'
import { FilterBar } from './FilterBar'

export const metadata = { title: '文章管理' }

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; category?: string }>
}) {
  const params = await searchParams
  const { q, status, category } = params

  const env = await getAppCloudflareEnv()
  let sourcePosts: Awaited<ReturnType<typeof getPosts>> = []

  if (env?.DB) {
    try {
      if (q && q.trim()) {
        sourcePosts = await searchPosts(env.DB, q.trim(), 200, true, true, true, true) // includeDrafts, includeEncrypted, includeHidden, includeDeleted
      } else {
        sourcePosts = await getPosts(env.DB, 200, 0, true, true, true, true) // includeDrafts, includeEncrypted, includeHidden, includeDeleted
      }
    } catch (error) {
      console.error('Posts fetch error:', error)
    }
  }

  // 英文译文状态（仅取状态，不取正文；已过期用中文正文指纹比对）
  const translationInfo = new Map<number, TranslationInfo>()
  if (env?.DB && sourcePosts.length > 0) {
    try {
      const ids = sourcePosts.map((p) => p.id)
      const summaries = await getPostTranslationSummaries(env.DB, ids, 'en')
      const withHash = Array.from(summaries.values()).filter((item) => item.source_hash).map((item) => item.post_id)
      const currentHashes = await getCurrentSourceHashes(env.DB, withHash)
      for (const [postId, item] of summaries) {
        translationInfo.set(postId, {
          status: item.has_content ? item.status : null,
          stale: item.has_content && getTranslationFreshness(item.source_hash, currentHashes.get(postId) ?? '') === 'stale',
        })
      }
    } catch (error) {
      console.error('Translation summaries error:', error)
    }
  }

  // 从 categories 表获取正式分类列表（用于 PostRow 下拉菜单）
  let dbCategories: string[] = []
  if (env?.DB) {
    try {
      const cats = await getCategories(env.DB)
      dbCategories = cats.map(c => c.name).filter(n => n !== '未分类')
    } catch {}
  }

  // 从文章数据提取分类（用于 FilterBar 筛选）
  const postCategories = Array.from(
    new Set(sourcePosts.map((p) => p.category).filter(Boolean))
  ) as string[]

  const stats = {
    all: sourcePosts.length,
    published: sourcePosts.filter((p) => p.status === 'published').length,
    draft: sourcePosts.filter((p) => p.status === 'draft').length,
    deleted: sourcePosts.filter((p) => p.status === 'deleted').length,
    encrypted: sourcePosts.filter((p) => !!p.password).length,
    unlisted: sourcePosts.filter((p) => p.is_hidden === 1).length,
    pinned: sourcePosts.filter((p) => p.is_pinned === 1).length,
  }

  let posts = sourcePosts
  if (status && status !== 'all') {
    switch (status) {
      case 'encrypted':
        posts = posts.filter((p) => !!p.password)
        break
      case 'unlisted':
        posts = posts.filter((p) => p.is_hidden === 1)
        break
      case 'pinned':
        posts = posts.filter((p) => p.is_pinned === 1)
        break
      default:
        posts = posts.filter((p) => p.status === status)
    }
  }
  if (category && category !== 'all') {
    posts = posts.filter((p) => p.category === category)
  }

  return (
    <div>
      <AdminPageHeader
        title="文章"
        description="管理已发布的文章、草稿和英文版。"
      />

      <FilterBar
        currentStatus={status}
        currentCategory={category}
        categories={postCategories}
        initialQuery={q}
        counts={stats}
        resultCount={posts.length}
      />

      {posts.length === 0 ? (
        <Empty className="rounded-2xl border border-dashed py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{q ? '未找到匹配的文章' : '还没有任何文章'}</EmptyTitle>
            <EmptyDescription>{q ? '试试其他关键词。' : '开始创作，分享你的思考。'}</EmptyDescription>
          </EmptyHeader>
          {!q && (
            <EmptyContent>
              <Button render={<Link href="/editor" />}>写第一篇文章</Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标题</TableHead>
                <TableHead className="hidden w-40 md:table-cell">分类</TableHead>
                <TableHead className="hidden w-24 text-right sm:table-cell">阅读</TableHead>
                <TableHead className="w-28 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => (
                <PostRow key={post.slug} post={post} categories={dbCategories} translation={translationInfo.get(post.id) ?? null} />
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
