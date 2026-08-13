import { nanoid } from 'nanoid'
import { renderMarkdownContent } from '@/lib/markdown'
import { buildDiaryDescription, normalizeDiarySlug } from '@/lib/diary-utils'

export type DiaryStatusInput = 'draft' | 'published' | 'deleted'

export async function buildDiaryEntryPayload(payload: Record<string, unknown>) {
  const title = typeof payload.title === 'string' ? payload.title.trim() : ''
  const rawHtml = typeof payload.html === 'string' ? payload.html.trim() : ''
  const rawContent = typeof payload.content === 'string' ? payload.content.trim() : ''
  const content = rawContent || stripHtmlForDiaryContent(rawHtml)
  const customSlug = typeof payload.slug === 'string' ? normalizeDiarySlug(payload.slug) : ''
  const status: DiaryStatusInput = payload.status === 'draft' || payload.status === 'deleted'
    ? payload.status
    : 'published'
  const isHidden = payload.is_hidden === 1 ? 1 : 0
  const coverImage = typeof payload.cover_image === 'string' && payload.cover_image.trim()
    ? payload.cover_image.trim()
    : null
  const description = typeof payload.description === 'string' && payload.description.trim()
    ? payload.description.trim()
    : buildDiaryDescription(content)

  if (!title || !content) {
    throw new Error('标题和内容不能为空')
  }

  const date = new Date().toISOString().split('T')[0]
  const slug = customSlug || `${date}-diary-${nanoid(6)}`
  const html = rawHtml || await renderMarkdownContent(content)

  return {
    slug,
    title,
    content,
    html,
    description,
    status,
    is_hidden: isHidden,
    cover_image: coverImage,
  }
}

function stripHtmlForDiaryContent(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
