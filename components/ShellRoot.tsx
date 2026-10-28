'use client'

import type { ReactNode } from 'react'
import { useLocale } from '@/lib/i18n-client'
import { LOCALE_META } from '@/lib/i18n'

/** 在站点外壳上按 URL 前缀标注 lang，让 CSS 的 :lang() 在首屏（含服务端渲染）就能区分中英文排版。 */
export function ShellRoot({ children }: { children: ReactNode }) {
  const locale = useLocale()
  return (
    <div className="site-shell" lang={LOCALE_META[locale].htmlLang}>
      {children}
    </div>
  )
}
