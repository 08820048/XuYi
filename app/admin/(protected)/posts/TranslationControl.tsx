'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Languages, Loader2 } from 'lucide-react'
import { Modal } from '@/components/admin/Modal'
import { useToast } from '@/components/admin/toast'
import { Button } from '@/components/ui/button'
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from '@/components/ui/menu'

export interface TranslationInfo {
  /** 英文版状态；null 表示还没有英文版 */
  status: 'draft' | 'published' | null
  /** 写完英文版之后，中文版又改过 */
  stale: boolean
}

async function api<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`)
  return data
}

/** 文章列表里的「英文版」入口：状态标签 + 菜单。英文版由你在编辑器里自己写、自己发布。 */
export function TranslationControl({
  slug,
  info,
  locked,
}: {
  slug: string
  info?: TranslationInfo | null
  /** 加密文章不提供英文版 */
  locked?: boolean
}) {
  const router = useRouter()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [refreshing, startRefresh] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const base = `/api/admin/posts/${encodeURIComponent(slug)}/translations/en`
  const status = info?.status ?? null
  const editHref = `/editor?edit=${encodeURIComponent(slug)}&lang=en`
  const viewHref = `/en/${encodeURIComponent(slug)}${status === 'draft' ? '?preview=1' : ''}`

  if (locked) return null

  async function setPublished(next: 'published' | 'draft') {
    setBusy(true)
    try {
      await api(base, 'PATCH', { status: next })
      toast.success(next === 'published' ? '英文版已发布' : '英文版已下线为草稿')
      startRefresh(() => router.refresh())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败')
    } finally {
      setBusy(false)
    }
  }

  async function removeTranslation() {
    setBusy(true)
    try {
      await api(base, 'DELETE')
      toast.success('英文版已删除')
      startRefresh(() => router.refresh())
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败')
      return false
    } finally {
      setBusy(false)
    }
  }

  let label = '无'
  let tone = 'text-muted-foreground'
  if (refreshing) {
    label = '更新中…'
  } else if (status === 'published') {
    label = info?.stale ? '已发布 · 中文有更新' : '已发布'
    tone = info?.stale ? 'text-warning-foreground' : 'text-success-foreground'
  } else if (status === 'draft') {
    label = info?.stale ? '草稿 · 中文有更新' : '草稿'
    tone = 'text-warning-foreground'
  }

  return (
    <>
      <Menu>
        <MenuTrigger
          render={<Button variant="outline" size="xs" disabled={busy || refreshing} aria-label="英文版" className={tone} />}
        >
          {refreshing ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Languages aria-hidden="true" />}
          EN · {label}
        </MenuTrigger>
        <MenuPopup align="start">
          {status === null ? (
            <MenuItem render={<a href={editHref} />}>写英文版（以中文内容为起点）</MenuItem>
          ) : (
            <>
              <MenuItem render={<a href={editHref} />}>编辑英文版</MenuItem>
              <MenuItem render={<a href={viewHref} target="_blank" rel="noreferrer" />}>
                {status === 'draft' ? '预览英文版' : '查看英文版'}
              </MenuItem>
              {status === 'draft' ? (
                <MenuItem onClick={() => setPublished('published')}>发布英文版</MenuItem>
              ) : (
                <MenuItem onClick={() => setPublished('draft')}>下线为草稿</MenuItem>
              )}
              <MenuSeparator />
              <MenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
                删除英文版
              </MenuItem>
            </>
          )}
        </MenuPopup>
      </Menu>

      <Modal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={removeTranslation}
        title="删除英文版"
        description="英文版会被永久删除（中文原文不受影响），此操作无法恢复。"
        confirmText="删除"
        type="danger"
      />
    </>
  )
}
