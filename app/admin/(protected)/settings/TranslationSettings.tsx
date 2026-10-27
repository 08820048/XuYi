'use client'

import { useState } from 'react'

interface Props {
  initialAboutEn: string
  onSave: (key: string, value: string) => Promise<void> | void
  saving: boolean
}

const fieldClass =
  'w-full rounded-xl border border-[var(--editor-line)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--editor-ink)] outline-none transition-colors placeholder:text-[var(--editor-muted)] focus:border-[var(--editor-accent)]'

/** 英文站设置：英文「关于我」（显示在 /en/about）。文章的英文版在文章列表 / 编辑器里写。 */
export function TranslationSettings({ initialAboutEn, onSave, saving }: Props) {
  const [aboutEn, setAboutEn] = useState(initialAboutEn)

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-[var(--editor-ink)]">英文「关于我」</h2>
        <p className="mt-1 text-sm text-[var(--editor-muted)]">
          显示在 /en/about，支持 Markdown。留空时英文页面回退显示中文「关于我」内容。
          文章的英文版请在「文章」列表里点 EN 标签来写和发布。
        </p>
      </div>
      <textarea
        value={aboutEn}
        onChange={(event) => setAboutEn(event.target.value)}
        spellCheck={false}
        className={`${fieldClass} min-h-[320px] resize-y font-mono leading-7`}
        placeholder="# About"
      />
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void onSave('about_markdown_en', aboutEn)}
          disabled={saving}
          className="kami-btn-primary px-4 py-2 text-sm disabled:opacity-50"
        >
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </section>
  )
}
