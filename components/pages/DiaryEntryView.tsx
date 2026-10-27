import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getAppCloudflareEnv } from '@/lib/cloudflare'
import {
  getDiaryEntryBySlug,
  incrementDiaryEntryViewCount,
  isPubliclyAccessibleDiaryEntry,
} from '@/lib/db'
import { SiteShell } from '@/components/SiteShell'
import { getSiteHeaderData } from '@/lib/site'
import { decodeRouteSegment } from '@/lib/route-segments'
import { getDiaryDisplayTitle, getDiaryPath } from '@/lib/diary-utils'
import { getSiteUrl } from '@/lib/site-config'
import { LangSync } from '@/components/LangSync'
import { LOCALE_META, localePath, t, type Locale } from '@/lib/i18n'
import { GitHubAlertEnhancer } from '@/components/GitHubAlertEnhancer'
import { CodeHighlightEnhancer } from '@/components/CodeHighlightEnhancer'
import { MathRenderEnhancer } from '@/components/MathRenderEnhancer'
import { DiagramRenderEnhancer } from '@/components/DiagramRenderEnhancer'
import { highlightHtml } from '@/lib/shiki-highlight'

function formatDate(ts: number, lang: Locale) {
  return new Date(ts * 1000).toLocaleDateString(LOCALE_META[lang].dateLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export async function buildDiaryMetadata(rawSlug: string, lang: Locale = 'zh') {
  const slug = decodeRouteSegment(rawSlug)
  const baseUrl = getSiteUrl()

  try {
    const env = await getAppCloudflareEnv()
    if (!env?.DB) return {}

    const entry = await getDiaryEntryBySlug(env.DB, slug)
    if (!entry || !isPubliclyAccessibleDiaryEntry(entry)) return {}

    const displayTitle = getDiaryDisplayTitle(entry)

    return {
      title: `${displayTitle} | ${t(lang, 'diaryTitle')}`,
      description: entry.description || undefined,
      alternates: {
        canonical: `${baseUrl}${localePath(getDiaryPath(entry.slug), lang)}`,
      },
    }
  } catch {
    return {}
  }
}

export async function DiaryEntryView({ slug: rawSlug, lang = 'zh' }: { slug: string; lang?: Locale }) {
  const slug = decodeRouteSegment(rawSlug)

  const env = await getAppCloudflareEnv()
  if (!env?.DB) notFound()

  const entry = await getDiaryEntryBySlug(env.DB, slug)
  if (!entry || !isPubliclyAccessibleDiaryEntry(entry)) notFound()

  const headerData = await getSiteHeaderData(env.DB)
  void incrementDiaryEntryViewCount(env.DB, slug).catch(console.error)
  const title = entry.title?.trim()
  const highlightedHtml = await highlightHtml(entry.html)

  return (
    <SiteShell
      initialTheme={headerData.defaultTheme}
      navLinks={headerData.navLinks}
    >
        <LangSync locale={lang} />
        <Link href={localePath('/diary', lang)} className="kami-back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>{t(lang, 'backToDiary')}</span>
        </Link>

        <article className="mt-8 sm:mt-10">
          {entry.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={entry.cover_image} alt="" className="diary-media kami-media aspect-[16/9] w-full object-cover" />
          ) : null}
          <header className={`kami-article-header ${entry.cover_image ? 'mt-8 sm:mt-10' : ''}`}>
            <p className="kami-label">Diary</p>
            {title ? (
              <h1 className="kami-article-title">
                {title}
              </h1>
            ) : null}
            <time
              dateTime={new Date(entry.published_at * 1000).toISOString()}
              className="kami-article-meta"
            >
              {formatDate(entry.published_at, lang)}
            </time>
          </header>
          <div
            id="diary-content"
            className="rich-content diary-content [text-wrap:pretty]"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
          <GitHubAlertEnhancer containerId="diary-content" html={highlightedHtml} />
          <CodeHighlightEnhancer containerId="diary-content" html={highlightedHtml} />
          <MathRenderEnhancer containerId="diary-content" html={highlightedHtml} />
          <DiagramRenderEnhancer containerId="diary-content" html={highlightedHtml} />
        </article>
    </SiteShell>
  )
}
