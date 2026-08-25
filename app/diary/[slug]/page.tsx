import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getAppCloudflareEnv } from '@/lib/cloudflare'
import {
  getDiaryEntryBySlug,
  incrementDiaryEntryViewCount,
  isPubliclyAccessibleDiaryEntry,
} from '@/lib/db'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { getSiteHeaderData } from '@/lib/site'
import { decodeRouteSegment } from '@/lib/route-segments'
import { getDiaryDisplayTitle, getDiaryPath } from '@/lib/diary-utils'
import { getSiteUrl } from '@/lib/site-config'

const BASE_URL = getSiteUrl()

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug: rawSlug } = await params
  const slug = decodeRouteSegment(rawSlug)

  try {
    const env = await getAppCloudflareEnv()
    if (!env?.DB) return {}

    const entry = await getDiaryEntryBySlug(env.DB, slug)
    if (!entry || !isPubliclyAccessibleDiaryEntry(entry)) return {}

    const displayTitle = getDiaryDisplayTitle(entry)

    return {
      title: `${displayTitle} | 日记`,
      description: entry.description || undefined,
      alternates: {
        canonical: `${BASE_URL}${getDiaryPath(entry.slug)}`,
      },
    }
  } catch {
    return {}
  }
}

export default async function DiaryEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug: rawSlug } = await params
  const slug = decodeRouteSegment(rawSlug)

  const env = await getAppCloudflareEnv()
  if (!env?.DB) notFound()

  const entry = await getDiaryEntryBySlug(env.DB, slug)
  if (!entry || !isPubliclyAccessibleDiaryEntry(entry)) notFound()

  const headerData = await getSiteHeaderData(env.DB)
  void incrementDiaryEntryViewCount(env.DB, slug).catch(console.error)
  const title = entry.title?.trim()

  return (
    <div className="flex min-h-full flex-col bg-[var(--background)] text-[var(--foreground)]">
      <SiteHeader
        initialTheme={headerData.defaultTheme}
        navLinks={headerData.navLinks}
      />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <Link
          href="/diary"
          className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-[var(--editor-muted)] transition-colors duration-150 hover:text-[var(--editor-accent)] active:scale-[0.96]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>返回日记</span>
        </Link>

        <article className="mt-7 sm:mt-10">
          {entry.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={entry.cover_image} alt="" className="diary-media aspect-[16/9] w-full rounded-[6px] object-cover" />
          ) : null}
          <header className={`${entry.cover_image ? 'mt-8 sm:mt-10' : ''} mx-auto max-w-3xl pb-4 sm:pb-6`}>
            <time
              dateTime={new Date(entry.published_at * 1000).toISOString()}
              className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--editor-muted)] tabular-nums"
            >
              {formatDate(entry.published_at)}
            </time>
            {title ? (
              <h1 className="mt-4 text-3xl font-extrabold leading-tight [text-wrap:balance] sm:text-4xl">
                {title}
              </h1>
            ) : null}
          </header>
          <div
            className="rich-content diary-content mx-auto max-w-3xl pt-7 [text-wrap:pretty] sm:pt-9"
            dangerouslySetInnerHTML={{ __html: entry.html }}
          />
        </article>
      </main>

      <SiteFooter />
    </div>
  )
}
