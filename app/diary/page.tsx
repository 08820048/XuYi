import { getAppCloudflareEnv } from '@/lib/cloudflare'
import { getDiaryEntries, getDiaryEntriesCount } from '@/lib/db'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { Pagination } from '@/components/Pagination'
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
  const date = new Date(ts * 1000)
  return {
    day: date.toLocaleDateString('zh-CN', { day: '2-digit' }),
    monthAndYear: date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' }),
    weekday: date.toLocaleDateString('zh-CN', { weekday: 'short' }),
    full: date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    }),
  }
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
    <div className="flex min-h-full flex-col bg-[var(--background)] text-[var(--foreground)]">
      <SiteHeader
        initialTheme={headerData.defaultTheme}
        navLinks={headerData.navLinks}
      />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <section className="public-page-header">
          <p className="public-page-kicker">LOG / DAILY NOTES</p>
          <h1 className="public-page-title">
            日记
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--editor-muted)] [text-wrap:pretty]">
            零散的生活、临时的念头、照片和片段。
          </p>
        </section>

        {entries.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-[var(--editor-muted)]">还没有公开日记。</p>
          </div>
        ) : (
          <div>
            <div>
              {entries.map((entry) => {
                const date = formatDate(entry.published_at)
                const title = entry.title?.trim()

                return (
                  <article
                    key={entry.slug}
                    className="diary-record grid gap-5 py-10 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-8 sm:py-14"
                  >
                    <time dateTime={new Date(entry.published_at * 1000).toISOString()} className="flex items-baseline gap-2 text-[var(--editor-muted)] sm:block">
                      <span className="block font-mono text-3xl font-bold leading-none text-[var(--editor-ink)] tabular-nums">
                        {date.day}
                      </span>
                      <span className="text-xs font-medium sm:mt-2 sm:block">{date.monthAndYear}</span>
                      <span className="text-xs sm:mt-1 sm:block">{date.weekday}</span>
                      <span className="sr-only">{date.full}</span>
                    </time>

                    <div className="min-w-0">
                      {entry.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={entry.cover_image}
                          alt=""
                          className="diary-media mb-7 aspect-[16/9] w-full rounded-[6px] object-cover sm:mb-9"
                        />
                      ) : null}
                      {title ? (
                        <h2 className="mb-6 text-2xl font-bold leading-snug text-[var(--editor-ink)] [text-wrap:balance] sm:mb-8 sm:text-3xl">
                          {title}
                        </h2>
                      ) : null}
                      <div
                        className="rich-content diary-content [text-wrap:pretty]"
                        dangerouslySetInnerHTML={{ __html: entry.html }}
                      />
                    </div>
                  </article>
                )
              })}
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/diary" />
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
