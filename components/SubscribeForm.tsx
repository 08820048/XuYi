'use client'

// 首页邮件订阅表单：纯客户端提交（首页有 revalidate 页面缓存，不能走服务端注入）
import { ArrowRight, LoaderCircle, Mail } from 'lucide-react'
import { useState } from 'react'

export function SubscribeForm({ minimal = false }: { minimal?: boolean }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed || loading) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      const data = await res.json().catch(() => null)

      if (res.ok && data?.success) {
        setSuccessMessage('订阅成功，下一篇文章发布时会通知你。')
        setEmail('')
      } else {
        setError(res.status === 400 ? '请输入有效的邮箱地址。' : '提交失败，请稍后重试。')
      }
    } catch {
      setError('网络错误，请稍后重试。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      aria-label="Email newsletter"
      className="subscribe-panel"
    >
      <div
        className={
          minimal
            ? 'mx-auto w-full max-w-md'
            : 'mx-auto flex max-w-xl flex-col items-center text-center'
        }
      >
        {!minimal && (
          <div>
            <h3
              className="m-0 text-[1.125rem] font-medium leading-snug text-[var(--editor-ink)]"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              订阅更新
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--editor-muted)]">
              新文章发布时收到邮件通知，随时可退订。
            </p>
          </div>
        )}

        {successMessage ? (
          <p role="status" className={`${minimal ? '' : 'mt-5'} text-sm text-[var(--editor-accent)]`}>
            {successMessage}
          </p>
        ) : (
          <div className={minimal ? '' : 'mx-auto mt-5 max-w-md'}>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <label className="flex min-w-0 flex-1 items-center gap-2.5 px-3">
                <Mail className="h-4 w-4 shrink-0 text-[var(--editor-muted)]" aria-hidden />
                <span className="sr-only">Email address</span>
                <input
                  type="email"
                  required
                  maxLength={254}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ outline: 'none' }}
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-[var(--editor-ink)] placeholder:text-[var(--editor-muted)]"
                />
              </label>
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="kami-btn-primary inline-flex min-w-[7.25rem] shrink-0 items-center justify-center gap-2 px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-label="Subscribing" />
                ) : (
                  <>
                    <span>Notify me</span>
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </>
                )}
              </button>
            </form>
            {error && <p role="alert" className="mt-2 text-xs text-rose-500">{error}</p>}
          </div>
        )}
      </div>
    </section>
  )
}
