export const POST_TYPES = ['original', 'repost', 'translation'] as const

export type PostType = typeof POST_TYPES[number]

export const DEFAULT_POST_TYPE: PostType = 'original'

export const POST_TYPE_LABELS: Record<PostType, string> = {
  original: '原创',
  repost: '转载',
  translation: '翻译',
}

export function normalizePostType(value: unknown): PostType {
  return typeof value === 'string' && POST_TYPES.includes(value as PostType)
    ? value as PostType
    : DEFAULT_POST_TYPE
}

export function requiresSourceUrl(type: PostType): boolean {
  return type === 'repost' || type === 'translation'
}

export function normalizePostSourceUrl(value: unknown): string | null {
  const sourceUrl = typeof value === 'string' ? value.trim() : ''
  if (!sourceUrl) return null

  try {
    const url = new URL(sourceUrl)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}
