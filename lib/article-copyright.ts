import { t, type Locale } from '@/lib/i18n'

export const ARTICLE_COPYRIGHT_NOTICE =
  '本文内容版权归作者或相关权利人所有。转载、引用或其他使用请遵循相应授权条款，并保留本文链接。'

const CLIPBOARD_LABELS: Record<Locale, { title: string; link: string }> = {
  zh: { title: '文章标题：', link: '本文链接：' },
  en: { title: 'Title: ', link: 'Link: ' },
}

export function formatArticleCopyrightText({
  title,
  articleUrl,
  sourceUrl,
  locale = 'zh',
}: {
  title: string
  articleUrl: string
  sourceUrl?: string | null
  locale?: Locale
}) {
  const labels = CLIPBOARD_LABELS[locale]
  return [
    `${t(locale, 'copyrightTitle')}${locale === 'zh' ? '：' : ': '}${t(locale, 'copyrightBody')}`,
    `${labels.title}${title}`,
    `${labels.link}${articleUrl}`,
    ...(sourceUrl ? [`${t(locale, 'sourceLink')}${sourceUrl}`] : []),
  ].join('\n')
}
