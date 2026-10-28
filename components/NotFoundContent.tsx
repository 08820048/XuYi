'use client'

import Link from 'next/link'
import { useT } from '@/lib/i18n-client'
import { localePath } from '@/lib/i18n'

/** 404 页内容：按 URL 前缀区分中英文（/en/... 显示英文）。 */
export function NotFoundContent() {
  const { locale, t } = useT()
  return (
    <header className="kami-page-header">
      <p className="kami-label">404</p>
      <h1 className="kami-display">{t('notFoundTitle')}</h1>
      <p className="kami-lead">{t('notFoundLead')}</p>
      <p style={{ marginTop: '2rem' }}>
        <Link href={localePath('/', locale)} className="kami-btn-secondary" style={{ display: 'inline-flex', padding: '0.55rem 1.2rem' }}>
          {t('backHome')}
        </Link>
      </p>
    </header>
  )
}
