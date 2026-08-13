import Link from 'next/link'
import { getAppCloudflareEnv } from '@/lib/cloudflare'
import { getDiaryEntries } from '@/lib/db'
import { DiaryRow } from './DiaryRow'

export const metadata = { title: '日记管理' }

export default async function AdminDiaryPage() {
  let entries: Awaited<ReturnType<typeof getDiaryEntries>> = []

  try {
    const env = await getAppCloudflareEnv()
    if (env?.DB) {
      entries = await getDiaryEntries(env.DB, 200, 0, true, true, true)
    }
  } catch (error) {
    console.error('Diary fetch error:', error)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium text-[var(--editor-ink)]" style={{ fontFamily: 'Georgia, serif' }}>
            日记
          </h1>
          <p className="mt-1 text-sm text-[var(--editor-muted)]">记录日常、图片、视频和临时想法。</p>
        </div>
        <Link
          href="/admin/diary/edit?new=1"
          className="rounded-lg bg-[var(--editor-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
        >
          写日记
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-[var(--editor-line)] bg-[var(--editor-panel)] p-16 text-center">
          <p className="text-sm text-[var(--editor-muted)]">还没有日记。</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--editor-line)] bg-[var(--editor-panel)]">
          <div className="hidden grid-cols-[1fr_90px_120px_180px] gap-3 border-b border-[var(--editor-line)] bg-[var(--editor-soft)] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--editor-muted)] md:grid">
            <span>标题</span>
            <span>状态</span>
            <span>来源</span>
            <span className="text-right">操作</span>
          </div>
          <div className="divide-y divide-[var(--editor-line)]">
            {entries.map((entry) => (
              <DiaryRow key={entry.slug} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
