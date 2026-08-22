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
        setSuccessMessage(data.message || '确认邮件已发送，请查收并点击确认链接。')
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
      style={{
        borderTop: '1px solid var(--editor-line)',
        marginTop: 48,
        paddingTop: 40,
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--stone-gray)',
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        }}
      >
        Newsletter
      </div>
      <h3
        style={{
          margin: '10px 0 6px',
          fontSize: 19,
          fontWeight: 700,
          lineHeight: 1.4,
          color: 'var(--editor-ink)',
          fontFamily: 'Georgia, "Noto Serif SC", serif',
        }}
      >
        订阅博客更新
      </h3>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: 'var(--stone-gray)' }}>
        新文章发布时会通过邮件通知你，随时可以退订。
      </p>

      {successMessage ? (
        <p
          role="status"
          style={{
            margin: '16px 0 0',
            padding: '12px 16px',
            fontSize: 13,
            lineHeight: 1.7,
            color: 'var(--editor-accent)',
            background: 'color-mix(in srgb, var(--editor-accent) 8%, transparent)',
            borderRadius: 8,
          }}
        >
          {successMessage}
        </p>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              required
              maxLength={254}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="邮箱地址"
              className="w-full rounded-lg border border-[var(--editor-line)] bg-white px-3 py-2.5 text-sm text-[var(--editor-ink)] outline-none focus:border-[var(--editor-accent)] focus:ring-2 focus:ring-[var(--editor-accent)]/15 transition-all duration-150 sm:max-w-xs"
            />
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="shrink-0 rounded-lg bg-[var(--editor-accent)] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-105 transition-all duration-150 disabled:opacity-50 sm:self-start"
            >
              {loading ? '提交中…' : '订阅'}
            </button>
          </form>
          {error && <p role="alert" className="mt-2 text-xs text-rose-500">{error}</p>}
        </>
      )}
    </section>
  )
}
