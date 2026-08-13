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

export function getDiaryPath(slug: string): string {
  return `/diary/${encodeURIComponent(slug)}`
}
