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
    <span className={`kami-tag kami-tag--quiet shrink-0 ${className}`}>
      {POST_TYPE_LABELS[normalizedType]}
    </span>
  )
}
