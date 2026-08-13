import { redirect } from 'next/navigation'
import { getAppCloudflareEnv } from '@/lib/cloudflare'
import { getDiaryEntryBySlug } from '@/lib/db'
import { NovelEditorClient } from '@/components/NovelEditorClient'

export const metadata = { title: '编辑日记' }

export default async function DiaryEditorPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; new?: string }>
}) {
  const params = await searchParams
  const edit = params.edit
  const isNew = params.new === '1'

  let initialData:
    | {
        slug: string
        title: string | null
        html: string
        status?: 'draft' | 'published' | 'deleted'
        is_hidden?: number
        description?: string | null
        cover_image?: string | null
      }
    | undefined

  if (edit) {
    const env = await getAppCloudflareEnv()
    if (!env?.DB) {
      redirect('/admin/diary')
    }

    const entry = await getDiaryEntryBySlug(env.DB, edit)
    if (entry) {
      initialData = {
        slug: entry.slug,
        title: entry.title,
        html: entry.html,
        status: entry.status,
        is_hidden: entry.is_hidden,
        description: entry.description,
        cover_image: entry.cover_image,
      }
    }
  }

  return <NovelEditorClient contentKind="diary" initialData={initialData} skipDraftRestore={isNew} />
}
