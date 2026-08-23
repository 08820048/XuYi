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
      className={`inline-flex shrink-0 items-center font-mono text-[10px] font-semibold text-[var(--editor-muted)] ${className}`}
    >
      [{POST_TYPE_LABELS[normalizedType]}]
    </span>
  )
}
