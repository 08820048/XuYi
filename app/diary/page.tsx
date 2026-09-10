import { getAppCloudflareEnv } from '@/lib/cloudflare'
import { getDiaryEntries, getDiaryEntriesCount } from '@/lib/db'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { Pagination } from '@/components/Pagination'
import { getSiteHeaderData } from '@/lib/site'
import { getSiteUrl } from '@/lib/site-config'
import { CodeHighlightEnhancer } from '@/components/CodeHighlightEnhancer'
import { highlightHtml } from '@/lib/shiki-highlight'

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
    defaultTheme: 'kami',
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
  const highlightedEntries = await Promise.all(
    entries.map(async (entry) => ({
      ...entry,
      html: await highlightHtml(entry.html),
    })),
  )

  return (
    <div className="flex min-h-full flex-col bg-[var(--background)] text-[var(--foreground)]">
      <SiteHeader
        initialTheme={headerData.defaultTheme}
        navLinks={headerData.navLinks}
      />

      <main id="diary-list" className="kami-page-main">
        <header className="kami-page-header">
          <p className="kami-label">00 · Diary</p>
          <h1 className="kami-display">日记</h1>
          <p className="kami-lead">
            零散的生活、临时的念头、照片和片段。
          </p>
        </header>

        {entries.length === 0 ? (
          <p className="kami-empty">还没有公开日记。</p>
        ) : (
          <div>
            <div className="kami-diary-list">
              {highlightedEntries.map((entry) => {
                const date = formatDate(entry.published_at)
                const title = entry.title?.trim()

                return (
                  <article key={entry.slug} className="kami-diary">
                    <time dateTime={new Date(entry.published_at * 1000).toISOString()} className="kami-diary-date">
                      <span className="kami-metric">{date.day}</span>
                      <span className="kami-diary-caption">{date.monthAndYear}</span>
                      <span className="kami-diary-caption">{date.weekday}</span>
                      <span className="sr-only">{date.full}</span>
                    </time>

                    <div className="min-w-0">
                      {entry.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={entry.cover_image}
                          alt=""
                          className="diary-media kami-media mb-7 aspect-[16/9] w-full object-cover sm:mb-8"
                        />
                      ) : null}
                      {title ? (
                        <h2 className="kami-diary-title">
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
        <CodeHighlightEnhancer
          containerId="diary-list"
          html={highlightedEntries.map((entry) => entry.html).join('\n')}
        />
      </main>

      <SiteFooter />
    </div>
  )
}
