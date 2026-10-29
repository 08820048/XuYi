'use client'

// 首页邮件订阅表单：纯客户端提交（首页有 revalidate 页面缓存，不能走服务端注入）
import { ArrowRight, LoaderCircle, Mail } from 'lucide-react'
import { useState } from 'react'
import { useT } from '@/lib/i18n-client'

export function SubscribeForm({ minimal = false }: { minimal?: boolean }) {
  const { t } = useT()
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
        setSuccessMessage(t('subscribeSuccess'))
        setEmail('')
      } else {
        setError(res.status === 400 ? t('invalidEmail') : t('submitFailed'))
      }
    } catch {
      setError(t('networkError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      aria-label="Email newsletter"
      className={minimal ? 'subscribe-panel subscribe-panel--minimal' : 'subscribe-panel'}
    >
      <header className="subscribe-panel-copy">
        <p className="kami-label">{t('newsletter')}</p>
        <h3 className="subscribe-panel-title">{t('subscribeTitle')}</h3>
        <p className="subscribe-panel-lead">
          {t('subscribeLead')}
        </p>
      </header>

      <div className="subscribe-panel-body">
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
                  <span>{t('subscribe')}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </>
              )}
            </button>
          </form>
          {error && <p role="alert" className="subscribe-panel-error">{error}</p>}
        </>
      )}
      </div>
    </section>
  )
}
