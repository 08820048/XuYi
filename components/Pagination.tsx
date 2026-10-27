import Link from 'next/link'
import { localeFromPathname, t } from '@/lib/i18n'

interface PaginationProps {
  currentPage: number
  totalPages: number
  basePath: string
}

export function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  if (totalPages <= 1) return null
  const locale = localeFromPathname(basePath)

  const pages: (number | '...')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  const href = (page: number) =>
    page === 1 ? basePath : `${basePath}${basePath.includes('?') ? '&' : '?'}page=${page}`

  return (
    <nav className="kami-pagination flex flex-wrap items-center justify-center gap-1 mt-14" aria-label={t(locale, 'pagination')}>
      {currentPage > 1 && (
        <Link href={href(currentPage - 1)} className="kami-page-link px-3 py-2 text-sm">
          {t(locale, 'prevPage')}
        </Link>
      )}

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`dot-${i}`} className="px-2 text-[var(--kami-stone)]">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            className={`min-w-[2rem] px-2.5 py-2 text-center font-mono text-sm ${
              p === currentPage
                ? 'kami-page-active rounded-lg'
                : 'kami-page-link rounded-lg'
            }`}
          >
            {p}
          </Link>
        )
      )}

      {currentPage < totalPages && (
        <Link href={href(currentPage + 1)} className="kami-page-link px-3 py-2 text-sm">
          {t(locale, 'nextPage')}
        </Link>
      )}
    </nav>
  )
}
