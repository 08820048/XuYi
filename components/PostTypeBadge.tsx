import { POST_TYPE_LABELS, normalizePostType, type PostType } from '@/lib/post-type'

export function PostTypeBadge({
  type,
  className = '',
}: {
  type?: PostType | null
  className?: string
}) {
  const normalizedType = normalizePostType(type)
  if (normalizedType === 'original') return null

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border border-[var(--editor-accent)]/20 bg-[var(--editor-accent)]/8 px-2 py-0.5 text-xs font-medium text-[var(--editor-accent)] ${className}`}
    >
      {POST_TYPE_LABELS[normalizedType]}
    </span>
  )
}
