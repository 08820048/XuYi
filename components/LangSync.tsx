'use client'

import { useEffect } from 'react'
import { LOCALE_META, type Locale } from '@/lib/i18n'

/** 根 layout 不感知路由，进入 /en 页面时把 <html lang> 同步为对应语言。 */
export function LangSync({ locale }: { locale: Locale }) {
  useEffect(() => {
    const root = document.documentElement
    const previous = root.lang
    root.lang = LOCALE_META[locale].htmlLang
    return () => {
      root.lang = previous
    }
  }, [locale])
  return null
}
