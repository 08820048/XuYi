import Link from 'next/link'
import { getAppCloudflareEnv } from '@/lib/cloudflare'
import { getDiaryEntries, getDiaryEntriesCount } from '@/lib/db'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { Pagination } from '@/components/Pagination'
import { getDiaryPath } from '@/lib/diary-utils'
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
    <div className="min-h-full bg-[#fffaf2] text-[#27211d]">
      <SiteHeader
        initialTheme={headerData.defaultTheme}
        navLinks={headerData.navLinks}
        categories={headerData.categories}
      />

      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <section className="mb-10 border-b border-[#e8dccb] pb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#a06c45]">Daily Notes</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
            日记
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#74665b]">
            零散的生活、临时的念头、照片和片段。这里不按技术文章的方式排队。
          </p>
        </section>

        {entries.length === 0 ? (
          <div className="rounded-2xl border border-[#eadfce] bg-white/65 px-6 py-16 text-center">
            <p className="text-sm text-[#74665b]">还没有公开日记。</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-3 top-0 hidden h-full w-px bg-[#e7d7c3] sm:block" />
            <div className="space-y-6">
              {entries.map((entry) => (
                <article key={entry.slug} className="relative sm:pl-12">
                  <span className="absolute left-0 top-8 hidden h-6 w-6 rounded-full border-4 border-[#fffaf2] bg-[#d98d55] sm:block" />
                  <Link
                    href={getDiaryPath(entry.slug)}
                    className="group block overflow-hidden rounded-2xl border border-[#eadfce] bg-white/78 shadow-sm transition hover:-translate-y-0.5 hover:border-[#d98d55]/50 hover:shadow-md"
                  >
                    {entry.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={entry.cover_image} alt="" className="h-56 w-full object-cover" />
                    ) : null}
                    <div className="p-5 sm:p-6">
                      <time className="text-xs font-medium text-[#a06c45]">{formatDate(entry.published_at)}</time>
                      <h2 className="mt-2 text-2xl font-semibold leading-snug text-[#27211d] group-hover:text-[#b65f2e]">
                        {entry.title}
                      </h2>
                      {entry.description ? (
                        <p className="mt-3 line-clamp-3 text-sm leading-7 text-[#74665b]">{entry.description}</p>
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
