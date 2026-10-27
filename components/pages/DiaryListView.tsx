import { getAppCloudflareEnv } from '@/lib/cloudflare'
import { getDiaryEntries, getDiaryEntriesCount } from '@/lib/db'
import { SiteShell } from '@/components/SiteShell'
import { Pagination } from '@/components/Pagination'
import { LangSync } from '@/components/LangSync'
import { LOCALE_META, localePath, t, type Locale } from '@/lib/i18n'
import { getSiteHeaderData } from '@/lib/site'
import { CodeHighlightEnhancer } from '@/components/CodeHighlightEnhancer'
import { MathRenderEnhancer } from '@/components/MathRenderEnhancer'
import { DiagramRenderEnhancer } from '@/components/DiagramRenderEnhancer'
import { highlightHtml } from '@/lib/shiki-highlight'

const PAGE_SIZE = 20
function formatDate(ts: number, lang: Locale) {
  const date = new Date(ts * 1000)
  const locale = LOCALE_META[lang].dateLocale
  return {
    day: date.toLocaleDateString(locale, { day: '2-digit' }),
    monthAndYear: date.toLocaleDateString(locale, { year: 'numeric', month: 'long' }),
    weekday: date.toLocaleDateString(locale, { weekday: 'short' }),
    full: date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    }),
  }
}

export async function DiaryListView({ page: pageStr, lang = 'zh' }: { page?: string; lang?: Locale }) {
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
    <SiteShell
      initialTheme={headerData.defaultTheme}
      navLinks={headerData.navLinks}
      mainId="diary-list"
    >
        <LangSync locale={lang} />
        <header className="kami-page-header">
          <p className="kami-label">00 · Diary</p>
          <h1 className="kami-display">{t(lang, 'diaryTitle')}</h1>
          <p className="kami-lead">
            {t(lang, 'diaryLead')}
          </p>
        </header>

        {entries.length === 0 ? (
          <p className="kami-empty">{t(lang, 'diaryEmpty')}</p>
        ) : (
          <div>
            <div className="kami-diary-list">
              {highlightedEntries.map((entry) => {
                const date = formatDate(entry.published_at, lang)
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
            <Pagination currentPage={currentPage} totalPages={totalPages} basePath={localePath('/diary', lang)} />
          </div>
        )}
        <CodeHighlightEnhancer
          containerId="diary-list"
          html={highlightedEntries.map((entry) => entry.html).join('\n')}
        />
        <MathRenderEnhancer
          containerId="diary-list"
          html={highlightedEntries.map((entry) => entry.html).join('\n')}
        />
        <DiagramRenderEnhancer
          containerId="diary-list"
          html={highlightedEntries.map((entry) => entry.html).join('\n')}
        />
    </SiteShell>
  )
}
