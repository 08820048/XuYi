export function sanitizeDiarySlugInput(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/_{2,}/g, '_')
}

export function normalizeDiarySlug(value: string): string {
  return sanitizeDiarySlugInput(value)
    .replace(/^[-_]+|[-_]+$/g, '')
}

export function buildDiaryDescription(value: string, maxLength = 120): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  return normalized.slice(0, maxLength)
}

export function formatDiaryDateTitle(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function getDiaryDisplayTitle(entry: {
  title?: string | null
  description?: string | null
  published_at: number
}): string {
  const title = entry.title?.trim()
  if (title) return title

  const description = entry.description?.trim()
  if (description) {
    return description.length > 24 ? `${description.slice(0, 24)}...` : description
  }

  return `${formatDiaryDateTitle(entry.published_at)}的日记`
}

export function getDiaryPath(slug: string): string {
  return `/diary/${encodeURIComponent(slug)}`
}
