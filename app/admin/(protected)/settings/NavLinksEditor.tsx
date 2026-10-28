'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardPanel } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

interface NavLink {
  label: string
  url: string
  openInNewTab: boolean
}

interface Props {
  initialValue: string
  onSave: (value: string) => void
  saving: boolean
}

const defaultLinks: NavLink[] = [
  { label: 'GitHub', url: 'https://github.com/08820048/XuYi-Blog', openInNewTab: true },
  { label: '关于我', url: '/about', openInNewTab: false },
  { label: '友联', url: '/links', openInNewTab: false },
  { label: 'RSS', url: '/feed.xml', openInNewTab: false },
]

export function NavLinksEditor({ initialValue, onSave, saving }: Props) {
  const parsed = initialValue ? (() => { try { return JSON.parse(initialValue) } catch { return null } })() : null
  const [links, setLinks] = useState<NavLink[]>(parsed && Array.isArray(parsed) ? parsed : defaultLinks)

  const update = (idx: number, field: keyof NavLink, value: string | boolean) => {
    setLinks((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)))
  }

  const remove = (idx: number) => setLinks((prev) => prev.filter((_, i) => i !== idx))

  const add = () => setLinks((prev) => [...prev, { label: '', url: '', openInNewTab: false }])

  const moveUp = (idx: number) => {
    if (idx <= 0) return
    setLinks((prev) => { const n = [...prev]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; return n })
  }

  const moveDown = (idx: number) => {
    if (idx >= links.length - 1) return
    setLinks((prev) => { const n = [...prev]; [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]]; return n })
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardPanel className="space-y-2 p-4">
          {links.map((link, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2">
              <Input
                className="w-28 sm:w-32"
                placeholder="名称"
                aria-label="名称"
                value={link.label}
                onChange={(e) => update(idx, 'label', e.target.value)}
              />
              <Input
                className="min-w-[12rem] flex-1"
                placeholder="URL"
                aria-label="URL"
                value={link.url}
                onChange={(e) => update(idx, 'url', e.target.value)}
              />
              <label className="flex cursor-pointer select-none items-center gap-2 text-muted-foreground text-xs">
                <Switch checked={link.openInNewTab} onCheckedChange={(checked) => update(idx, 'openInNewTab', checked)} />
                新窗口
              </label>
              <Button variant="ghost" size="icon-sm" aria-label="上移" disabled={idx === 0} onClick={() => moveUp(idx)}>
                <ArrowUp aria-hidden="true" />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="下移" disabled={idx === links.length - 1} onClick={() => moveDown(idx)}>
                <ArrowDown aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="删除"
                className="text-destructive-foreground"
                onClick={() => remove(idx)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          ))}
        </CardPanel>
      </Card>

      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={add}>
          <Plus aria-hidden="true" />
          添加链接
        </Button>
        <Button onClick={() => onSave(JSON.stringify(links))} loading={saving}>
          保存导航
        </Button>
      </div>
    </div>
  )
}
