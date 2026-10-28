'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/admin/Modal'
import { useToast } from '@/components/admin/toast'
import { Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { FriendLinkRow } from '@/lib/db'

interface EditableFriendLink {
  id: number
  name: string
  url: string
  description: string
  avatar_url: string | null
  sort_order: number
  is_visible: number
}

const emptyDraft = {
  name: '',
  url: '',
  description: '',
  avatar_url: '',
  sort_order: 0,
  is_visible: 1,
}

function toEditable(link: FriendLinkRow): EditableFriendLink {
  return {
    id: link.id,
    name: link.name,
    url: link.url,
    description: link.description || '',
    avatar_url: link.avatar_url,
    sort_order: link.sort_order,
    is_visible: link.is_visible,
  }
}

export function FriendLinksManager({ initialLinks }: { initialLinks: FriendLinkRow[] }) {
  const [links, setLinks] = useState(initialLinks.map(toEditable))
  const [draft, setDraft] = useState(emptyDraft)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editing, setEditing] = useState(emptyDraft)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deleteModal, setDeleteModal] = useState<EditableFriendLink | null>(null)
  const router = useRouter()
  const toast = useToast()

  const updateDraft = (field: keyof typeof emptyDraft, value: string | number) => {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  const updateEditing = (field: keyof typeof emptyDraft, value: string | number) => {
    setEditing((current) => ({ ...current, [field]: value }))
  }

  const submitNew = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!draft.name.trim() || !draft.url.trim()) return

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/friend-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error || '添加失败')
      }

      setDraft(emptyDraft)
      router.refresh()
      toast.success('友联已添加')
      const refreshed = await fetch('/api/admin/friend-links').then((r) => r.json()) as { links?: FriendLinkRow[] }
      setLinks((refreshed.links || []).map(toEditable))
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败')
    } finally {
      setLoading(false)
    }
  }

  const startEditing = (link: EditableFriendLink) => {
    setEditingId(link.id)
    setEditing({
      name: link.name,
      url: link.url,
      description: link.description,
      avatar_url: link.avatar_url || '',
      sort_order: link.sort_order,
      is_visible: link.is_visible,
    })
  }

  const submitEdit = async () => {
    if (!editingId || !editing.name.trim() || !editing.url.trim()) return

    try {
      const res = await fetch('/api/admin/friend-links', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...editing }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error || '更新失败')
      }

      setLinks((current) =>
        current
          .map((item) => item.id === editingId ? { ...item, ...editing, avatar_url: editing.avatar_url || null } : item)
          .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
      )
      setEditingId(null)
      router.refresh()
      toast.success('友联已更新')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新失败')
    }
  }

  const confirmDelete = async () => {
    if (!deleteModal) return false

    try {
      const res = await fetch('/api/admin/friend-links', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteModal.id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error || '删除失败')
      }

      setLinks((current) => current.filter((item) => item.id !== deleteModal.id))
      setDeleteModal(null)
      router.refresh()
      toast.success('友联已删除')
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败')
      return false
    }
  }

  const renderFields = (
    values: typeof emptyDraft,
    update: (field: keyof typeof emptyDraft, value: string | number) => void,
  ) => (
    <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr_1.2fr_0.7fr_auto]">
      <Field>
        <FieldLabel>名称</FieldLabel>
        <Input value={values.name} onChange={(event) => update('name', event.target.value)} placeholder="如：某某博客" />
      </Field>
      <Field>
        <FieldLabel>链接</FieldLabel>
        <Input value={values.url} onChange={(event) => update('url', event.target.value)} placeholder="https://example.com" />
      </Field>
      <Field>
        <FieldLabel>头像</FieldLabel>
        <Input
          value={values.avatar_url}
          onChange={(event) => update('avatar_url', event.target.value)}
          placeholder="https://example.com/avatar.png"
        />
      </Field>
      <Field>
        <FieldLabel>排序</FieldLabel>
        <Input type="number" value={values.sort_order} onChange={(event) => update('sort_order', Number(event.target.value))} />
      </Field>
      <Field className="self-end">
        <FieldLabel className="flex h-8.5 items-center gap-2 sm:h-7.5">
          <Switch checked={values.is_visible === 1} onCheckedChange={(checked) => update('is_visible', checked ? 1 : 0)} />
          显示
        </FieldLabel>
      </Field>
      <Field className="lg:col-span-5">
        <FieldLabel>描述</FieldLabel>
        <Input value={values.description} onChange={(event) => update('description', event.target.value)} placeholder="一句话介绍这个站点" />
      </Field>
    </div>
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>添加友联</CardTitle>
          <CardDescription>友联会显示在前台的“友联”页面。</CardDescription>
        </CardHeader>
        <CardPanel>
          <form onSubmit={submitNew}>
            {renderFields(draft, updateDraft)}
            <div className="mt-4 flex items-center gap-3">
              <Button type="submit" loading={loading} disabled={!draft.name.trim() || !draft.url.trim()}>
                <Plus aria-hidden="true" />
                添加
              </Button>
              {error && <p className="text-destructive-foreground text-xs">{error}</p>}
            </div>
          </form>
        </CardPanel>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>站点</TableHead>
              <TableHead className="w-20">状态</TableHead>
              <TableHead className="w-24 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.map((link) =>
              editingId === link.id ? (
                <TableRow key={link.id}>
                  <TableCell colSpan={3} className="whitespace-normal">
                    <div className="space-y-3 py-1">
                      {renderFields(editing, updateEditing)}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={submitEdit}>
                          <Check aria-hidden="true" />
                          保存
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          取消
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={link.id}>
                  <TableCell className="max-w-0">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="size-9 rounded-lg">
                        {link.avatar_url && <AvatarImage src={link.avatar_url} alt="" className="rounded-lg" />}
                        <AvatarFallback className="rounded-lg">{link.name.slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate font-medium transition-colors hover:text-muted-foreground"
                        >
                          {link.name}
                        </a>
                        <p className="truncate text-muted-foreground text-xs">{link.description || link.url}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={link.is_visible ? 'success' : 'secondary'}>{link.is_visible ? '显示' : '隐藏'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button size="icon-sm" variant="ghost" aria-label="编辑" onClick={() => startEditing(link)}>
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="删除"
                        className="text-destructive-foreground"
                        onClick={() => setDeleteModal(link)}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ),
            )}
            {links.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                  暂无友联
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={confirmDelete}
        title="确认删除"
        description={`确定删除友联「${deleteModal?.name}」吗？`}
        confirmText="删除"
        type="danger"
      />
    </div>
  )
}
