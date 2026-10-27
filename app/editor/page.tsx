import { getPostBySlug, getPostTranslation } from '@/lib/db'
import { getAppCloudflareEnv } from '@/lib/cloudflare'
import { isAdminAuthenticated, COOKIE_NAME } from '@/lib/admin-auth'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { NovelEditorClient } from '@/components/NovelEditorClient'

export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; slug?: string; new?: string; lang?: string }>
}) {
  // 鉴权：只有登录的管理员才能访问编辑器
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(COOKIE_NAME)?.value
  const isAuthenticated = await isAdminAuthenticated(cookieValue)

  if (!isAuthenticated) {
    const params = await searchParams
    const editSlug = params.edit ?? params.slug
    const langParam = params.lang === 'en' ? '&lang=en' : ''
    const editParam = editSlug ? `?edit=${editSlug}${langParam}` : params.new === '1' ? '?new=1' : ''
    redirect(`/admin/login?redirect_to=${encodeURIComponent(`/editor${editParam}`)}`)
  }

  const params = await searchParams
  const edit = params.edit ?? params.slug
  const isNew = params.new === '1'
  const isTranslation = Boolean(edit) && params.lang === 'en'
  let translationSeeded = false

  let initialData: {
    slug: string
    title: string
    html: string
    category?: string
    status?: 'draft' | 'published' | 'deleted'
    password?: string | null
    is_hidden?: number
    tags?: string[]
    description?: string | null
    cover_image?: string | null
    post_type?: 'original' | 'repost' | 'translation'
    source_url?: string | null
  } | undefined

  if (edit) {
    const env = await getAppCloudflareEnv()
    if (env?.DB) {
      const post = await getPostBySlug(env.DB, edit)
      if (post && isTranslation) {
        // 英文版：已有就载入；还没有就用中文版的标题和内容原样复制作为起点（保存后才会生成）
        const translation = await getPostTranslation(env.DB, post.id, 'en').catch(() => null)
        const hasTranslation = Boolean(translation?.html)
        translationSeeded = !hasTranslation
        initialData = {
          slug: post.slug,
          title: hasTranslation ? translation!.title : post.title,
          html: hasTranslation ? translation!.html : post.html,
          description: hasTranslation ? translation!.description : '',
          status: hasTranslation && translation!.status === 'published' ? 'published' : 'draft',
        }
      } else if (post) {
        initialData = {
          slug: post.slug,
          title: post.title,
          html: post.html,
          category: post.category || undefined,
          status: post.status,
          password: post.password,
          is_hidden: post.is_hidden,
          tags: post.tags,
          description: post.description,
          cover_image: post.cover_image,
          post_type: post.post_type,
          source_url: post.source_url,
        }
      }
    }
  }

  return (
    <NovelEditorClient
      contentKind={isTranslation && initialData ? 'translation' : 'post'}
      translationSeeded={translationSeeded}
      initialData={initialData}
      skipDraftRestore={isNew}
    />
  )
}
