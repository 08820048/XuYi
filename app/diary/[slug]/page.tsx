import Link from 'next/link'
import { notFound } from 'next/navigation'
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
  const displayTitle = getDiaryDisplayTitle(entry)

  return (
    <div className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
      <SiteHeader
        initialTheme={headerData.defaultTheme}
        navLinks={headerData.navLinks}
        categories={headerData.categories}
      />

      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <Link href="/diary" className="text-sm font-medium text-[var(--editor-muted)] hover:text-[var(--editor-accent)] hover:underline">
          返回日记
        </Link>

        <article className="mt-8 overflow-hidden rounded-3xl border border-[var(--editor-line)] bg-[var(--background)] shadow-sm">
          {entry.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={entry.cover_image} alt="" className="h-72 w-full object-cover" />
          ) : null}
          <header className="border-b border-[var(--editor-line)] px-6 py-7 sm:px-8">
            <time className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--editor-muted)]">
              {formatDate(entry.published_at)}
            </time>
            <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
              {displayTitle}
            </h1>
          </header>
          <div
            className="rich-content px-6 py-7 sm:px-8"
            dangerouslySetInnerHTML={{ __html: entry.html }}
          />
        </article>
      </main>

      <SiteFooter />
    </div>
  )
}
