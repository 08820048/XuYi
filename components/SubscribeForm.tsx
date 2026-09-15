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
      className={minimal ? 'subscribe-panel subscribe-panel--minimal' : 'subscribe-panel'}
    >
      {!minimal && (
        <header className="subscribe-panel-copy">
          <p className="kami-label">Newsletter</p>
          <h3 className="subscribe-panel-title">订阅更新</h3>
          <p className="subscribe-panel-lead">
            新文章发布时收到邮件通知，随时可退订。
          </p>
        </header>
      )}

      {successMessage ? (
        <p role="status" className="subscribe-panel-status">
          {successMessage}
        </p>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="subscribe-form">
            <label className="subscribe-field">
              <Mail className="subscribe-field-icon" aria-hidden />
              <span className="sr-only">Email address</span>
              <input
                type="email"
                required
                maxLength={254}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="kami-btn-primary subscribe-submit"
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
          {error && <p role="alert" className="subscribe-panel-error">{error}</p>}
        </>
      )}
    </section>
  )
}
