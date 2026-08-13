'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Edit, ExternalLink, Trash2 } from 'lucide-react'
import { useToast } from '@/components/Toast'
import type { DiaryEntry } from '@/lib/db'
import { getDiaryPath } from '@/lib/diary-utils'

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function DiaryRow({ entry }: { entry: DiaryEntry }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const toast = useToast()

  const toggleStatus = async () => {
    setLoading(true)
    try {
      const nextStatus = entry.status === 'published' ? 'draft' : 'published'
      const res = await fetch(`/api/admin/diary/${entry.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) throw new Error('更新失败')
      toast.success(nextStatus === 'published' ? '日记已发布' : '日记已转草稿')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新失败')
    } finally {
      setLoading(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`确定永久删除「${entry.title}」吗？`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/diary/${entry.slug}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('删除失败')
      toast.success('日记已删除')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_90px_120px_180px] md:items-center">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-[var(--editor-ink)]">{entry.title}</div>
        <div className="mt-1 text-xs text-[var(--editor-muted)]">
          {formatDate(entry.published_at)} · {entry.view_count} 次查看
        </div>
      </div>
      <button
        type="button"
        onClick={() => void toggleStatus()}
        disabled={loading}
        className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${
          entry.status === 'published'
            ? 'bg-emerald-50 text-emerald-700'
            : entry.status === 'deleted'
              ? 'bg-rose-50 text-rose-700'
              : 'bg-[var(--editor-soft)] text-[var(--editor-muted)]'
        }`}
      >
        {entry.status === 'published' ? '已发布' : entry.status === 'deleted' ? '已删除' : '草稿'}
      </button>
      <span className="text-xs text-[var(--editor-muted)]">{entry.source === 'email' ? '邮件' : '后台'}</span>
      <div className="flex justify-start gap-2 md:justify-end">
        <Link
          href={`/admin/diary/edit?edit=${encodeURIComponent(entry.slug)}`}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--editor-line)] px-2.5 py-1.5 text-xs text-[var(--editor-ink)] hover:bg-[var(--editor-soft)]"
        >
          <Edit className="h-3.5 w-3.5" />
          编辑
        </Link>
        <Link
          href={getDiaryPath(entry.slug)}
          target="_blank"
          className="inline-flex items-center gap-1 rounded-md border border-[var(--editor-line)] px-2.5 py-1.5 text-xs text-[var(--editor-ink)] hover:bg-[var(--editor-soft)]"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          查看
        </Link>
        <button
          type="button"
          onClick={() => void remove()}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          删除
        </button>
      </div>
    </div>
  )
}
