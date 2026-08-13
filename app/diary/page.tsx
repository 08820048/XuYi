import Link from 'next/link'
import { getAppCloudflareEnv } from '@/lib/cloudflare'
import { getDiaryEntries, getDiaryEntriesCount } from '@/lib/db'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { Pagination } from '@/components/Pagination'
import { getDiaryDisplayTitle, getDiaryPath } from '@/lib/diary-utils'
import { getSiteHeaderData } from '@/lib/site'
import { getSiteUrl } from '@/lib/site-config'

const PAGE_SIZE = 20
const BASE_URL = getSiteUrl()

export const metadata = {
  title: '日记',
  alternates: {
    canonical: `${BASE_URL}/diary`,
  },
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

export default async function DiaryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageStr } = await searchParams
  const currentPage = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)

  let entries: Awaited<ReturnType<typeof getDiaryEntries>> = []
  let totalCount = 0
  let headerData: Awaited<ReturnType<typeof getSiteHeaderData>> = {
    navLinks: [],
    categories: [],
    defaultTheme: 'refined',
  }

  try {
    const env = await getAppCloudflareEnv()
    if (env?.DB) {
      ;[entries, totalCount, headerData] = await Promise.all([
        getDiaryEntries(env.DB, PAGE_SIZE, (currentPage - 1) * PAGE_SIZE),
        getDiaryEntriesCount(env.DB),
        getSiteHeaderData(env.DB),
      ])
    }
  } catch (error) {
    console.error('Diary page error:', error)
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <div className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
      <SiteHeader
        initialTheme={headerData.defaultTheme}
        navLinks={headerData.navLinks}
        categories={headerData.categories}
      />

      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <section className="mb-10 border-b border-[var(--editor-line)] pb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--editor-muted)]">Daily Notes</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
            日记
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--editor-muted)]">
            零散的生活、临时的念头、照片和片段。
          </p>
        </section>

        {entries.length === 0 ? (
          <div className="rounded-2xl border border-[var(--editor-line)] bg-[var(--background)] px-6 py-16 text-center shadow-sm">
            <p className="text-sm text-[var(--editor-muted)]">还没有公开日记。</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-3 top-0 hidden h-full w-px bg-[var(--editor-line)] sm:block" />
            <div className="space-y-6">
              {entries.map((entry) => (
                <article key={entry.slug} className="relative sm:pl-12">
                  <span className="absolute left-0 top-8 hidden h-6 w-6 rounded-full border-4 border-[var(--background)] bg-[var(--editor-accent)] sm:block" />
                  <Link
                    href={getDiaryPath(entry.slug)}
                    className="group block overflow-hidden rounded-2xl border border-[var(--editor-line)] bg-[var(--background)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--editor-accent)] hover:shadow-md"
                  >
                    {entry.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={entry.cover_image} alt="" className="h-56 w-full object-cover" />
                    ) : null}
                    <div className="p-5 sm:p-6">
                      <time className="text-xs font-medium text-[var(--editor-muted)]">{formatDate(entry.published_at)}</time>
                      <h2 className="mt-2 text-2xl font-semibold leading-snug text-[var(--editor-ink)] group-hover:text-[var(--editor-accent)]">
                        {getDiaryDisplayTitle(entry)}
                      </h2>
                      {entry.description ? (
                        <p className="mt-3 line-clamp-3 text-sm leading-7 text-[var(--editor-muted)]">{entry.description}</p>
                      ) : null}
                    </div>
                  </Link>
                </article>
              ))}
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/diary" />
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
