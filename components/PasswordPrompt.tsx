'use client'

import { useState } from 'react'

interface PasswordPromptProps {
  error?: string
}

export function PasswordPrompt({ error }: PasswordPromptProps) {
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password.trim()) {
      const url = new URL(window.location.href)
      url.searchParams.set('pwd', password.trim())
      window.location.href = url.toString()
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="kami-note p-6">
          <p className="kami-label">Protected</p>
          <h2 className="kami-section-title mb-2">此文章已加密</h2>
          <p className="kami-lead" style={{ marginTop: 0 }}>
            请输入密码查看内容
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoFocus
              className="kami-input"
            />
            {error && (
              <p className="text-sm text-[var(--kami-error)]">{error}</p>
            )}
            <button
              type="submit"
              disabled={!password.trim()}
              className="kami-btn-primary w-full py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              解锁文章
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
