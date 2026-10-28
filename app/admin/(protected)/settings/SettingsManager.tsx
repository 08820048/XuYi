'use client'

import { useState } from 'react'
import { AdminTabs } from '@/components/admin/AdminTabs'
import { useToast } from '@/components/admin/toast'
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import type { RuntimeCapabilities } from '@/lib/runtime-capabilities'
import type { BodyFont } from '@/lib/appearance'
import { NavLinksEditor } from './NavLinksEditor'
import { CustomJsEditor } from './CustomJsEditor'
import { ApiTokensManager } from './ApiTokensManager'
import { ThemeManager } from './ThemeManager'
import { AboutMarkdownEditor } from './AboutMarkdownEditor'
import { TranslationSettings } from './TranslationSettings'
import { CategoryManager } from '../categories/CategoryManager'
import { FriendLinksManager } from '../friend-links/FriendLinksManager'
import { AiProviderManager } from './AiProviderManager'
import { AiActionsManager } from './AiActionsManager'
import { AiImageProviderManager } from './AiImageProviderManager'
import { AiImageActionsManager } from './AiImageActionsManager'
import { AiPostGeneratorsManager } from './AiPostGeneratorsManager'
import { RuntimeCapabilitiesPanel } from './RuntimeCapabilitiesPanel'

interface Category {
  name: string
  slug: string
  post_count: number
}

interface FriendLink {
  id: number
  name: string
  url: string
  description: string
  avatar_url: string | null
  sort_order: number
  is_visible: number
  created_at: number
  updated_at: number
}

interface Props {
  initialNavLinks: string
  initialCustomJs: string
  initialAboutMarkdown: string
  initialAboutMarkdownEn: string
  initialCategories: Category[]
  initialFriendLinks: FriendLink[]
  initialBodyFont: string
  initialDiaryNavEnabled: string
  initialRuntimeCapabilities: RuntimeCapabilities
}

export function SettingsManager({
  initialNavLinks,
  initialCustomJs,
  initialAboutMarkdown,
  initialAboutMarkdownEn,
  initialCategories,
  initialFriendLinks,
  initialBodyFont,
  initialDiaryNavEnabled,
  initialRuntimeCapabilities,
}: Props) {
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const persistSetting = async (key: string, value: string) => {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    })
    if (!res.ok) throw new Error('保存失败')
  }

  const save = async (key: string, value: string) => {
    setSaving(true)
    try {
      await persistSetting(key, value)
      toast.success('已保存')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const saveFontSettings = async (font: BodyFont) => {
    setSaving(true)
    try {
      await Promise.all([
        persistSetting('default_theme', 'refined'),
        persistSetting('body_font', font),
      ])
      toast.success('已保存')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    {
      id: 'nav',
      label: '导航设置',
      content: (
        <div className="space-y-4">
          <NavLinksEditor
            initialValue={initialNavLinks}
            onSave={(val) => save('nav_links', val)}
            saving={saving}
          />
        </div>
      ),
    },
    {
      id: 'categories',
      label: '分类设置',
      content: <CategoryManager initialCategories={initialCategories} />,
    },
    {
      id: 'friend-links',
      label: '友联设置',
      content: <FriendLinksManager initialLinks={initialFriendLinks} />,
    },
    {
      id: 'diary',
      label: '日记设置',
      content: (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>页脚显示日记</CardTitle>
              <CardDescription>关闭后页脚不显示“日记”，已发布日记页面仍可通过链接访问。</CardDescription>
            </CardHeader>
            <CardPanel>
              <Switch
                aria-label="页脚显示日记"
                defaultChecked={initialDiaryNavEnabled === 'true'}
                onCheckedChange={(checked) => void save('diary_nav_enabled', String(checked))}
                disabled={saving}
              />
            </CardPanel>
          </Card>
        </div>
      ),
    },
    {
      id: 'about',
      label: '关于我',
      content: (
        <div className="space-y-4">
          <AboutMarkdownEditor
            initialValue={initialAboutMarkdown}
            onSave={(val) => save('about_markdown', val)}
            saving={saving}
          />
        </div>
      ),
    },
    {
      id: 'translate',
      label: '英文站',
      content: (
        <div className="space-y-4">
          <TranslationSettings
            initialAboutEn={initialAboutMarkdownEn}
            onSave={save}
            saving={saving}
          />
        </div>
      ),
    },
    {
      id: 'code',
      label: '自定义代码',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-[var(--editor-muted)]">
            此代码会注入到所有页面的 &lt;head&gt; 中，适合添加统计代码（如 Google Analytics、百度统计等）。
          </p>
          <CustomJsEditor
            initialValue={initialCustomJs}
            onSave={(val) => save('custom_js', val)}
            saving={saving}
          />
        </div>
      ),
    },
    {
      id: 'theme',
      label: '字体管理',
      content: (
        <ThemeManager
          initialFont={(initialBodyFont || 'default') as BodyFont}
          onSave={saveFontSettings}
          saving={saving}
        />
      ),
    },
    {
      id: 'tokens',
      label: 'API Token',
      content: <ApiTokensManager />,
    },
    {
      id: 'ai-provider',
      label: 'AI 模型',
      content: <AiProviderManager />,
    },
    {
      id: 'ai-actions',
      label: 'AI 操作',
      content: <AiActionsManager />,
    },
    {
      id: 'ai-image-provider',
      label: '图片模型',
      content: <AiImageProviderManager />,
    },
    {
      id: 'ai-image-actions',
      label: '图片提示',
      content: <AiImageActionsManager />,
    },
    {
      id: 'ai-post-generators',
      label: '文章生成',
      content: <AiPostGeneratorsManager />,
    },
    {
      id: 'runtime',
      label: '运行环境',
      content: <RuntimeCapabilitiesPanel capabilities={initialRuntimeCapabilities} />,
    },
  ]

  return <AdminTabs tabs={tabs} defaultTab="nav" />
}
