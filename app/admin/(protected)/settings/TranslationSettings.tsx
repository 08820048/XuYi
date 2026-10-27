'use client'

import { useEffect, useState } from 'react'

interface AiProfile {
  id: number
  name: string
  model: string
  is_default: number
}

interface Props {
  initialProfileId: string
  initialPrompt: string
  initialAboutEn: string
  onSave: (key: string, value: string) => Promise<void> | void
  saving: boolean
}

const fieldClass =
  'w-full rounded-xl border border-[var(--editor-line)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--editor-ink)] outline-none transition-colors placeholder:text-[var(--editor-muted)] focus:border-[var(--editor-accent)]'

/** 英文翻译设置：翻译用的模型档案、自定义提示词、英文「关于我」。 */
export function TranslationSettings({ initialProfileId, initialPrompt, initialAboutEn, onSave, saving }: Props) {
  const [profiles, setProfiles] = useState<AiProfile[]>([])
  const [profileId, setProfileId] = useState(initialProfileId)
  const [prompt, setPrompt] = useState(initialPrompt)
  const [aboutEn, setAboutEn] = useState(initialAboutEn)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/ai-provider')
      .then((res) => (res.ok ? res.json() : { profiles: [] }))
      .then((data: { profiles?: AiProfile[] }) => {
        if (!cancelled) setProfiles(data.profiles ?? [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const saveButton = (onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="kami-btn-primary px-4 py-2 text-sm disabled:opacity-50"
    >
      {saving ? '保存中…' : '保存'}
    </button>
  )

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--editor-ink)]">翻译模型</h2>
          <p className="mt-1 text-sm text-[var(--editor-muted)]">
            在文章列表里点「EN · 翻译」时使用的 AI 模型。翻译质量主要取决于模型，建议选能力较强的模型；
            不选则使用默认模型。模型档案在「AI 模型」页管理。
          </p>
        </div>
        <select value={profileId} onChange={(event) => setProfileId(event.target.value)} className={fieldClass}>
          <option value="">使用默认模型</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={String(profile.id)}>
              {profile.name}（{profile.model}）{profile.is_default ? ' · 默认' : ''}
            </option>
          ))}
        </select>
        <div className="flex justify-end">{saveButton(() => void onSave('translate_profile_id', profileId))}</div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--editor-ink)]">翻译补充要求</h2>
          <p className="mt-1 text-sm text-[var(--editor-muted)]">
            追加到翻译提示词里，优先级高于默认规则。适合写术语表、人称和语气偏好，例如：
            「存档 = save file；产品名 Ornata 不翻译；语气随意一些，像在和朋友聊天」。
            Markdown 结构、代码块、链接和图片地址始终会被原样保留。
          </p>
        </div>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={6}
          spellCheck={false}
          className={`${fieldClass} resize-y leading-7`}
          placeholder="可留空"
        />
        <div className="flex justify-end">{saveButton(() => void onSave('translate_prompt', prompt))}</div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--editor-ink)]">英文「关于我」</h2>
          <p className="mt-1 text-sm text-[var(--editor-muted)]">
            显示在 /en/about。支持 Markdown。留空时英文页面回退显示中文「关于我」内容。
          </p>
        </div>
        <textarea
          value={aboutEn}
          onChange={(event) => setAboutEn(event.target.value)}
          spellCheck={false}
          className={`${fieldClass} min-h-[280px] resize-y font-mono leading-7`}
          placeholder="# About"
        />
        <div className="flex justify-end">{saveButton(() => void onSave('about_markdown_en', aboutEn))}</div>
      </section>
    </div>
  )
}
