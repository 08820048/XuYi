'use client'

import { useState } from 'react'

interface DiarySettingsManagerProps {
  initialNavEnabled: string
  initialEmailEnabled: string
  initialInboundAddress: string
  initialAllowedSender: string
  initialInboundSecret: string
  onSave: (settings: Record<string, string>) => Promise<void>
  saving: boolean
}

export function DiarySettingsManager({
  initialNavEnabled,
  initialEmailEnabled,
  initialInboundAddress,
  initialAllowedSender,
  initialInboundSecret,
  onSave,
  saving,
}: DiarySettingsManagerProps) {
  const [navEnabled, setNavEnabled] = useState(initialNavEnabled === 'true')
  const [emailEnabled, setEmailEnabled] = useState(initialEmailEnabled === 'true')
  const [inboundAddress, setInboundAddress] = useState(initialInboundAddress)
  const [allowedSender, setAllowedSender] = useState(initialAllowedSender)
  const [inboundSecret, setInboundSecret] = useState(initialInboundSecret)

  const saveAll = async () => {
    await onSave({
      diary_nav_enabled: String(navEnabled),
      diary_email_enabled: String(emailEnabled),
      diary_inbound_address: inboundAddress.trim(),
      diary_allowed_sender: allowedSender.trim(),
      diary_inbound_secret: inboundSecret.trim(),
    })
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[var(--editor-line)] bg-[var(--editor-panel)] p-5">
        <h3 className="mb-4 text-base font-semibold text-[var(--editor-ink)]">日记功能</h3>
        <div className="space-y-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={navEnabled}
              onChange={(event) => setNavEnabled(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[var(--editor-line)]"
            />
            <span>
              <span className="block text-sm font-medium text-[var(--editor-ink)]">前台顶部菜单显示“日记”</span>
              <span className="block text-xs text-[var(--editor-muted)]">启用后自动把 /diary 加入公开导航。</span>
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={emailEnabled}
              onChange={(event) => setEmailEnabled(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[var(--editor-line)]"
            />
            <span>
              <span className="block text-sm font-medium text-[var(--editor-ink)]">启用邮件快捷发布</span>
              <span className="block text-xs text-[var(--editor-muted)]">入站接口：POST /api/diary/email，需携带 x-diary-secret。</span>
            </span>
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--editor-line)] bg-[var(--editor-panel)] p-5">
        <h3 className="mb-4 text-base font-semibold text-[var(--editor-ink)]">邮件发布配置</h3>
        <div className="grid gap-4">
          <label>
            <span className="mb-1 block text-sm font-medium text-[var(--editor-ink)]">收件邮箱</span>
            <input
              value={inboundAddress}
              onChange={(event) => setInboundAddress(event.target.value)}
              placeholder="diary@your-domain.com"
              className="w-full rounded-lg border border-[var(--editor-line)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--editor-ink)] outline-none focus:border-[var(--editor-accent)]"
            />
            <span className="mt-1 block text-xs text-[var(--editor-muted)]">配置后只接受发往该邮箱的 Cloudflare Email Routing 邮件。</span>
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium text-[var(--editor-ink)]">允许发件人</span>
            <input
              value={allowedSender}
              onChange={(event) => setAllowedSender(event.target.value)}
              placeholder="me@example.com，多地址用英文逗号分隔"
              className="w-full rounded-lg border border-[var(--editor-line)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--editor-ink)] outline-none focus:border-[var(--editor-accent)]"
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium text-[var(--editor-ink)]">入站 Secret</span>
            <input
              value={inboundSecret}
              onChange={(event) => setInboundSecret(event.target.value)}
              placeholder="建议使用 32 位以上随机字符串"
              className="w-full rounded-lg border border-[var(--editor-line)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--editor-ink)] outline-none focus:border-[var(--editor-accent)]"
            />
          </label>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void saveAll()}
        disabled={saving}
        className="rounded-lg bg-[var(--editor-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
      >
        {saving ? '保存中…' : '保存日记设置'}
      </button>
    </div>
  )
}
