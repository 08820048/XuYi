'use client'

// 首页邮件订阅表单：纯客户端提交（首页有 revalidate 页面缓存，不能走服务端注入）
import { useState } from 'react'

export function SubscribeForm() {
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
        setSuccessMessage(data.message || '订阅成功，新文章发布时会通过邮件通知你。')
        setEmail('')
      } else {
        setError(data?.error || '订阅失败，请稍后重试')
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      aria-label="邮件订阅"
      className="subscribe-panel"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="shrink-0">
          <h3
            style={{
              margin: 0,
              fontSize: 19,
              fontWeight: 700,
              lineHeight: 1.4,
              color: 'var(--editor-ink)',
              fontFamily: 'var(--font-geist-sans), -apple-system, "PingFang SC", sans-serif',
            }}
          >
            订阅博客更新
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.6, color: 'var(--stone-gray)' }}>
            新文章发布时邮件通知，随时可以退订。
          </p>
        </div>

        {successMessage ? (
          <p role="status" className="m-0 text-sm text-[var(--editor-accent)]">
            {successMessage}
          </p>
        ) : (
          <div className="min-w-0 flex-1 sm:max-w-md">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="email"
                required
                maxLength={254}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="邮箱地址"
                className="min-w-0 flex-1 rounded-[7px] border border-[var(--editor-line)] bg-[var(--editor-panel)] px-3 py-2.5 text-sm text-[var(--editor-ink)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--editor-accent)] focus:ring-2 focus:ring-[var(--editor-accent)]/15"
              />
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="shrink-0 rounded-[7px] bg-[var(--editor-accent)] px-5 py-2.5 text-sm font-semibold text-white transition-[opacity,scale] duration-150 hover:opacity-90 active:scale-[0.96] disabled:opacity-50"
              >
                {loading ? '提交中…' : '订阅'}
              </button>
            </form>
            {error && <p role="alert" className="mt-2 text-xs text-rose-500">{error}</p>}
          </div>
        )}
      </div>
    </section>
  )
}
