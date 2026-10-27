'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Languages, Loader2 } from 'lucide-react'
import { Modal } from '@/components/Modal'
import { useToast } from '@/components/Toast'

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
  const [menuOpen, setMenuOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [refreshing, startRefresh] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const base = `/api/admin/posts/${encodeURIComponent(slug)}/translations/en`
  const status = info?.status ?? null
  const editHref = `/editor?edit=${encodeURIComponent(slug)}&lang=en`
  const viewHref = `/en/${encodeURIComponent(slug)}${status === 'draft' ? '?preview=1' : ''}`

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  if (locked) return null

  async function setPublished(next: 'published' | 'draft') {
    setMenuOpen(false)
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
  let tone = 'border-[var(--editor-line)] text-[var(--stone-gray)] hover:text-[var(--editor-ink)]'
  if (refreshing) {
    label = '更新中…'
  } else if (status === 'published') {
    label = info?.stale ? '已发布 · 中文有更新' : '已发布'
    tone = info?.stale ? 'border-amber-400 text-amber-600' : 'border-emerald-400 text-emerald-600'
  } else if (status === 'draft') {
    label = info?.stale ? '草稿 · 中文有更新' : '草稿'
    tone = 'border-amber-400 text-amber-600'
  }

  const item = 'block w-full px-3 py-1.5 text-left text-xs text-[var(--editor-ink)] hover:bg-[var(--editor-soft)]'

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        disabled={busy || refreshing}
        title="英文版"
        className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] leading-none transition-colors disabled:opacity-60 ${tone}`}
      >
        {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
        <span>EN · {label}</span>
      </button>

      {menuOpen && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-[11rem] overflow-hidden rounded-lg border border-[var(--editor-line)] bg-[var(--editor-panel)] py-1 shadow-lg">
          {status === null ? (
            <a className={item} href={editHref}>
              写英文版（以中文内容为起点）
            </a>
          ) : (
            <>
              <a className={item} href={editHref}>
                编辑英文版
              </a>
              <a className={item} href={viewHref} target="_blank" rel="noreferrer">
                {status === 'draft' ? '预览英文版' : '查看英文版'}
              </a>
              {status === 'draft' ? (
                <button type="button" className={item} onClick={() => setPublished('published')}>
                  发布英文版
                </button>
              ) : (
                <button type="button" className={item} onClick={() => setPublished('draft')}>
                  下线为草稿
                </button>
              )}
              <button
                type="button"
                className={`${item} text-rose-600`}
                onClick={() => {
                  setMenuOpen(false)
                  setConfirmDelete(true)
                }}
              >
                删除英文版
              </button>
            </>
          )}
        </div>
      )}

      <Modal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={removeTranslation}
        title="删除英文版"
        description="英文版会被永久删除（中文原文不受影响），此操作无法恢复。"
        confirmText="删除"
        type="danger"
      />
    </div>
  )
}
