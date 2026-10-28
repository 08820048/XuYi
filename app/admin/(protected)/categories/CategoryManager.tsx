'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/admin/toast'
import { Modal } from '@/components/admin/Modal'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface Category {
  name: string
  slug: string
  post_count: number
}

export function CategoryManager({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState(initialCategories)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editSlugVal, setEditSlugVal] = useState('')
  const [deleteModal, setDeleteModal] = useState<{ slug: string; name: string } | null>(null)
  const router = useRouter()
  const toast = useToast()

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) return

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error || '创建失败')
      }
      setName('')
      setSlug('')
      router.refresh()
      // Optimistic update
      setCategories((prev) => [...prev, { name: name.trim(), slug: slug.trim(), post_count: 0 }])
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (catSlug: string, catName: string) => {
    setDeleteModal({ slug: catSlug, name: catName })
  }

  const confirmDelete = async () => {
    if (!deleteModal) return false

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: deleteModal.slug }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error || '删除失败')
      }
      setCategories((prev) => prev.filter((c) => c.slug !== deleteModal.slug))
      toast.success('分类已删除')
      setDeleteModal(null)
      router.refresh()
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败')
      return false
    }
  }

  const startEditing = (cat: Category) => {
    setEditingSlug(cat.slug)
    setEditName(cat.name)
    setEditSlugVal(cat.slug)
  }

  const handleUpdate = async () => {
    if (!editingSlug || !editName.trim() || !editSlugVal.trim()) return
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldSlug: editingSlug, name: editName.trim(), slug: editSlugVal.trim() }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error || '更新失败')
      }
      setCategories((prev) =>
        prev.map((c) => c.slug === editingSlug ? { ...c, name: editName.trim(), slug: editSlugVal.trim() } : c)
      )
      setEditingSlug(null)
      toast.success('分类已更新')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新失败')
    }
  }

  // Auto-generate slug from name
  const handleNameChange = (val: string) => {
    setName(val)
    const autoSlug = val
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\u4e00-\u9fff-]/g, '')
    if (!slug || slug === name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\u4e00-\u9fff-]/g, '')) {
      setSlug(autoSlug)
    }
  }

  return (
    <div className="space-y-6">
      {/* 添加分类 */}
      <Card>
        <CardHeader>
          <CardTitle>添加分类</CardTitle>
          <CardDescription>Slug 会根据名称自动生成，也可以手动改。</CardDescription>
        </CardHeader>
        <CardPanel>
          <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field className="flex-1">
              <FieldLabel>名称</FieldLabel>
              <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="如：AI工具" />
            </Field>
            <Field className="flex-1">
              <FieldLabel>Slug</FieldLabel>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="如：ai-tools" className="font-mono" />
            </Field>
            <Button type="submit" loading={loading} disabled={!name.trim() || !slug.trim()}>
              <Plus aria-hidden="true" />
              添加
            </Button>
          </form>
          {error && <p className="mt-2 text-destructive-foreground text-xs">{error}</p>}
        </CardPanel>
      </Card>

      {/* 分类列表 */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-right">文章数</TableHead>
              <TableHead className="w-28 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((cat) => (
              <TableRow key={cat.slug}>
                {editingSlug === cat.slug ? (
                  <>
                    <TableCell>
                      <Input size="sm" value={editName} onChange={(e) => setEditName(e.target.value)} aria-label="分类名称" />
                    </TableCell>
                    <TableCell>
                      <Input size="sm" value={editSlugVal} onChange={(e) => setEditSlugVal(e.target.value)} className="font-mono" aria-label="Slug" />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{cat.post_count}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon-sm" variant="ghost" aria-label="保存" onClick={handleUpdate}>
                          <Check aria-hidden="true" />
                        </Button>
                        <Button size="icon-sm" variant="ghost" aria-label="取消" onClick={() => setEditingSlug(null)}>
                          <X aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="font-mono text-muted-foreground text-xs">{cat.slug}</TableCell>
                    <TableCell className="text-right tabular-nums">{cat.post_count}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon-sm" variant="ghost" aria-label="编辑" onClick={() => startEditing(cat)}>
                          <Pencil aria-hidden="true" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label="删除"
                          className="text-destructive-foreground"
                          onClick={() => handleDelete(cat.slug, cat.name)}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  暂无分类
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
        description={`确定删除分类「${deleteModal?.name}」吗？`}
        confirmText="删除"
        type="danger"
      />
    </div>
  )
}
