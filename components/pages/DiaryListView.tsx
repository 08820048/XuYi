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
    day: String(date.getDate()).padStart(2, '0'),
    monthKey: `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`,
    weekday: date.toLocaleDateString(locale, { weekday: 'short' }),
    time: date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false }),
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
        <header className="pg-head">
          <div className="pg-head-row">
            <h1 className="pg-title">
              {t(lang, 'diaryTitle')} <em>/ Diary</em>
            </h1>
            <span className="pg-count">{String(totalCount).padStart(2, '0')}</span>
          </div>
          <p className="pg-lead">{t(lang, 'diaryLead')}</p>
        </header>

        {entries.length === 0 ? (
          <p className="kami-empty">{t(lang, 'diaryEmpty')}</p>
        ) : (
          <div>
            <div className="dy-list">
              {highlightedEntries.map((entry, index) => {
                const date = formatDate(entry.published_at, lang)
                const title = entry.title?.trim()
                const previous = index > 0 ? formatDate(highlightedEntries[index - 1].published_at, lang) : null
                const startsMonth = !previous || previous.monthKey !== date.monthKey
                const monthCount = highlightedEntries.filter(
                  (item) => formatDate(item.published_at, lang).monthKey === date.monthKey,
                ).length

                return (
                  <div key={entry.slug} className="dy-group">
                    {startsMonth && (
                      <div className="dy-month">
                        <span>{date.monthKey}</span>
                        <span>{String(monthCount).padStart(2, '0')}</span>
                      </div>
                    )}
                    <article className="dy-entry">
                      <time dateTime={new Date(entry.published_at * 1000).toISOString()} className="dy-date">
                        <span className="dy-day">{date.day}</span>
                        <span className="dy-meta">{date.weekday}</span>
                        <span className="dy-meta">{date.time}</span>
                        <span className="sr-only">{date.full}</span>
                      </time>
                      <span className="dy-node" aria-hidden="true" />

                      <div className="dy-body">
                        {entry.cover_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={entry.cover_image}
                            alt=""
                            className="diary-media kami-media mb-6 aspect-[16/9] w-full object-cover"
                          />
                        ) : null}
                        {title ? <h2 className="dy-title">{title}</h2> : null}
                        <div
                          className="rich-content diary-content [text-wrap:pretty]"
                          dangerouslySetInnerHTML={{ __html: entry.html }}
                        />
                      </div>
                    </article>
                  </div>
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
