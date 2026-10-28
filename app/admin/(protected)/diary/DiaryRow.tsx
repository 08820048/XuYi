'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { useToast } from '@/components/admin/toast'
import { Modal } from '@/components/admin/Modal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import type { DiaryEntry } from '@/lib/db'
import { getDiaryDisplayTitle, getDiaryPath } from '@/lib/diary-utils'

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
  const [confirmDelete, setConfirmDelete] = useState(false)
  const router = useRouter()
  const toast = useToast()
  const displayTitle = getDiaryDisplayTitle(entry)

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
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/diary/${entry.slug}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('删除失败')
      toast.success('日记已删除')
      router.refresh()
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败')
      return false
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <TableRow>
        <TableCell className="max-w-0">
          <div className="truncate font-medium">{displayTitle}</div>
          <div className="mt-0.5 text-muted-foreground text-xs">
            {formatDate(entry.published_at)} · {entry.view_count} 次查看
          </div>
        </TableCell>
        <TableCell className="w-24">
          <Button
            variant="ghost"
            size="xs"
            disabled={loading}
            onClick={() => void toggleStatus()}
            aria-label={entry.status === 'published' ? '转为草稿' : '发布'}
          >
            <Badge variant={entry.status === 'published' ? 'success' : entry.status === 'deleted' ? 'error' : 'warning'}>
              {entry.status === 'published' ? '已发布' : entry.status === 'deleted' ? '已删除' : '草稿'}
            </Badge>
          </Button>
        </TableCell>
        <TableCell className="w-28">
          <div className="flex justify-end gap-1">
            <Button
              render={<Link href={`/admin/diary/edit?edit=${encodeURIComponent(entry.slug)}`} />}
              variant="ghost"
              size="icon-sm"
              aria-label="编辑"
            >
              <Pencil aria-hidden="true" />
            </Button>
            <Button render={<Link href={getDiaryPath(entry.slug)} target="_blank" />} variant="ghost" size="icon-sm" aria-label="查看">
              <ExternalLink aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="删除"
              className="text-destructive-foreground"
              disabled={loading}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      <Modal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title="永久删除日记"
        description={`确定永久删除「${displayTitle}」吗？此操作不可恢复。`}
        confirmText="永久删除"
        type="danger"
      />
    </>
  )
}
