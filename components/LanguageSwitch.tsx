'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { alternatePath, localeFromPathname, LOCALE_META, t, type Locale } from '@/lib/i18n'

/** 在当前页面的中 / 英版本之间切换（不保证对应页面一定有译文，缺译文的文章会回到中文版）。 */
export function LanguageSwitch({ className = '' }: { className?: string }) {
  const pathname = usePathname() || '/'
  const current = localeFromPathname(pathname)
  const target: Locale = current === 'en' ? 'zh' : 'en'

  return (
    <Link
      href={alternatePath(pathname, target)}
      hrefLang={LOCALE_META[target].htmlLang}
      lang={LOCALE_META[target].htmlLang}
      className={`sv-lang ${className}`.trim()}
      aria-label={t(current, 'switchLanguage')}
      title={t(current, 'switchLanguage')}
    >
      {LOCALE_META[target].label}
    </Link>
  )
}
