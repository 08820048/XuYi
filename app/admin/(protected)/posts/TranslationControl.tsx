'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Languages, Loader2 } from 'lucide-react'
import { Modal } from '@/components/Modal'
import { useToast } from '@/components/Toast'

export interface TranslationInfo {
  /** 有内容的译文状态；null 表示还没有可展示的译文（无 / 仅占位） */
  status: 'draft' | 'published' | null
  aiState: 'translating' | 'failed' | null
  aiError: string | null
  /** 中文正文在翻译之后又改过 */
  stale: boolean
}

type Progress = { done: number; total: number } | null

const CHUNK_CONCURRENCY = 2

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

/** 文章列表里的「英文版」入口：状态标签 + 操作菜单。翻译由浏览器分步驱动，进度实时显示。 */
export function TranslationControl({
  slug,
  info,
  locked,
}: {
  slug: string
  info?: TranslationInfo | null
  /** 加密文章不对外翻译 */
  locked?: boolean
}) {
  const router = useRouter()
  const toast = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<Progress>(null)
  const [busy, setBusy] = useState(false)
  const [refreshing, startRefresh] = useTransition()
  const [confirm, setConfirm] = useState<'retranslate' | 'delete' | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const base = `/api/admin/posts/${encodeURIComponent(slug)}/translations/en`
  const status = info?.status ?? null
  const interrupted = !running && info?.aiState === 'translating'
  const failed = !running && info?.aiState === 'failed'

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  if (locked) return null

  async function translate() {
    setMenuOpen(false)
    setRunning(true)
    setProgress({ done: 0, total: 0 })
    try {
      const start = await api<{ total: number; done: number; hash: string }>(`${base}/translate`, 'POST', { step: 'start' })
      let done = start.done
      setProgress({ done, total: start.total })

      // 逐段翻译；已完成的段服务端会直接返回（断点续传）
      const queue = Array.from({ length: start.total }, (_, i) => i)
      const worker = async () => {
        for (let index = queue.shift(); index !== undefined; index = queue.shift()) {
          const step = await api<{ done: number }>(`${base}/translate`, 'POST', { step: 'chunk', index, hash: start.hash })
          done = Math.max(done, step.done)
          setProgress({ done, total: start.total })
        }
      }
      await Promise.all(Array.from({ length: Math.min(CHUNK_CONCURRENCY, start.total) }, worker))

      const result = await api<{ title: string }>(`${base}/translate`, 'POST', { step: 'finish' })
      toast.success(`英文版已生成（草稿）：${result.title}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '翻译失败')
    } finally {
      setRunning(false)
      setProgress(null)
      startRefresh(() => router.refresh())
    }
  }

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

  // ---- 状态标签 ----
  let label = '翻译'
  let tone = 'border-[var(--editor-line)] text-[var(--stone-gray)] hover:text-[var(--editor-ink)]'
  if (!running && refreshing) {
    label = '更新中…'
    tone = 'border-[var(--editor-line)] text-[var(--stone-gray)]'
  } else if (running) {
    label = progress && progress.total > 0 ? `翻译中 ${progress.done}/${progress.total}` : '翻译中…'
    tone = 'border-[var(--editor-accent)] text-[var(--editor-accent)]'
  } else if (interrupted) {
    label = '翻译未完成'
    tone = 'border-amber-400 text-amber-600'
  } else if (failed) {
    label = '翻译失败'
    tone = 'border-rose-400 text-rose-600'
  } else if (status === 'published') {
    label = info?.stale ? '已发布 · 已过期' : '已发布'
    tone = info?.stale ? 'border-amber-400 text-amber-600' : 'border-emerald-400 text-emerald-600'
  } else if (status === 'draft') {
    label = info?.stale ? '草稿 · 已过期' : '草稿'
    tone = 'border-amber-400 text-amber-600'
  }

  const previewHref = `/en/${encodeURIComponent(slug)}${status === 'draft' ? '?preview=1' : ''}`

  const item = 'block w-full px-3 py-1.5 text-left text-xs text-[var(--editor-ink)] hover:bg-[var(--editor-soft)]'

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        disabled={busy || refreshing}
        title={failed && info?.aiError ? info.aiError : '英文版'}
        className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] leading-none transition-colors disabled:opacity-60 ${tone}`}
      >
        {running || refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
        <span>EN · {label}</span>
      </button>

      {menuOpen && !running && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-[10rem] overflow-hidden rounded-lg border border-[var(--editor-line)] bg-[var(--editor-panel)] py-1 shadow-lg">
          {failed && info?.aiError && (
            <p className="max-w-[16rem] px-3 py-1.5 text-[11px] leading-snug text-rose-600">{info.aiError}</p>
          )}
          {(status === null || interrupted || failed) && (
            <button type="button" className={item} onClick={translate}>
              {interrupted ? '继续翻译' : failed ? '重试翻译' : 'AI 翻译成英文'}
            </button>
          )}
          {status !== null && (
            <>
              <a className={item} href={previewHref} target="_blank" rel="noreferrer">
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
              {!interrupted && !failed && (
                <button
                  type="button"
                  className={item}
                  onClick={() => {
                    setMenuOpen(false)
                    setConfirm('retranslate')
                  }}
                >
                  重新翻译{info?.stale ? '（中文已更新）' : ''}
                </button>
              )}
              <button
                type="button"
                className={`${item} text-rose-600`}
                onClick={() => {
                  setMenuOpen(false)
                  setConfirm('delete')
                }}
              >
                删除英文版
              </button>
            </>
          )}
        </div>
      )}

      <Modal
        isOpen={confirm === 'retranslate'}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          void translate()
        }}
        title="重新翻译英文版"
        description={
          status === 'published'
            ? '会用 AI 重新翻译并覆盖现有英文版。完成后英文版变为草稿，需要预览后重新发布；翻译期间线上英文版保持不变。'
            : '会用 AI 重新翻译并覆盖现有英文草稿。'
        }
        confirmText="重新翻译"
        type="warning"
      />
      <Modal
        isOpen={confirm === 'delete'}
        onClose={() => setConfirm(null)}
        onConfirm={removeTranslation}
        title="删除英文版"
        description="英文版会被永久删除（中文原文不受影响），此操作无法恢复。"
        confirmText="删除"
        type="danger"
      />
    </div>
  )
}
