'use client'

import { usePathname } from 'next/navigation'
import { localeFromPathname, t, type Locale, type MessageKey } from '@/lib/i18n'

/** 客户端组件通过 URL 前缀得到当前语言（/en 为英文），避免层层透传 lang。 */
export function useLocale(): Locale {
  return localeFromPathname(usePathname())
}

export function useT() {
  const locale = useLocale()
  return {
    locale,
    t: (key: MessageKey, vars?: Record<string, string | number>) => t(locale, key, vars),
  }
}
