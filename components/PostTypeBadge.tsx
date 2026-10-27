import { normalizePostType, type PostType } from '@/lib/post-type'
import { t, type Locale } from '@/lib/i18n'

const LABEL_KEYS = {
  original: 'postTypeOriginal',
  repost: 'postTypeRepost',
  translation: 'postTypeTranslation',
} as const

export function PostTypeBadge({
  type,
  className = '',
  lang = 'zh',
}: {
  type?: PostType | null
  className?: string
  lang?: Locale
}) {
  const normalizedType = normalizePostType(type)
  if (normalizedType === 'original') return null

  return (
    <span className={`kami-tag kami-tag--quiet shrink-0 ${className}`}>
      {t(lang, LABEL_KEYS[normalizedType])}
    </span>
  )
}
