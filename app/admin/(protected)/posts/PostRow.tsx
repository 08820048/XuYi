'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArchiveRestore,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Link2,
  Lock,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Trash2,
  Unlock,
} from 'lucide-react'
import { useToast } from '@/components/admin/toast'
import { Modal } from '@/components/admin/Modal'
import { PasswordModal } from '@/components/admin/PasswordModal'
import { Dropdown } from '@/components/admin/Dropdown'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from '@/components/ui/menu'
import { TableCell, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip'
import type { PostWithTags } from '@/lib/db'
import { getSiteUrl } from '@/lib/site-config'
import { TranslationControl, type TranslationInfo } from './TranslationControl'

interface PostRowProps {
  post: PostWithTags
  categories: string[]
  translation?: TranslationInfo | null
}

function formatDate(ts: number) {
  const date = new Date(ts * 1000)
  const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays} 天前`
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

type Dialogs = 'password' | 'pin' | 'hidden' | 'status' | 'delete' | 'permanent' | null

export function PostRow({ post, categories, translation = null }: PostRowProps) {
  const [dialog, setDialog] = useState<Dialogs>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const toast = useToast()

  const baseArticleUrl = `${getSiteUrl()}/${post.slug}`
  const articleUrl = post.password ? `${baseArticleUrl}?pwd=${post.password}` : baseArticleUrl
  const isDeleted = post.status === 'deleted'
  const categoryOptions = [{ value: '', label: '未分类' }, ...categories.map((cat) => ({ value: cat, label: cat }))]

  /** 统一的更新请求：成功提示 + 刷新列表；失败提示并返回 false（弹窗据此保持打开）。 */
  async function update(body: Record<string, unknown>, ok: string, fail = '操作失败') {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/posts/${post.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success(ok)
        setDialog(null)
        router.refresh()
        return true
      }
      toast.error(fail)
      return false
    } catch {
      toast.error('网络错误')
      return false
    } finally {
      setLoading(false)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(articleUrl)
      toast.success(post.password ? '已复制带密码的链接' : '已复制链接')
    } catch {
      toast.error('复制失败')
    }
  }

  async function permanentDelete() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/posts/${post.slug}`, { method: 'DELETE' })
      let data: { success?: boolean; error?: string }
      try {
        data = (await res.json()) as { success?: boolean; error?: string }
      } catch {
        toast.error(`删除失败: HTTP ${res.status}`)
        return false
      }
      if (res.ok && data.success) {
        toast.success('已永久删除')
        setDialog(null)
        router.refresh()
        return true
      }
      toast.error(data.error || `删除失败 (${res.status})`)
      return false
    } catch (err) {
      toast.error(`网络错误: ${err instanceof Error ? err.message : '未知'}`)
      return false
    } finally {
      setLoading(false)
    }
  }

  const statusBadge =
    post.status === 'published' ? (
      <Badge variant="success">已发布</Badge>
    ) : post.status === 'deleted' ? (
      <Badge variant="secondary">已删除</Badge>
    ) : (
      <Badge variant="warning">草稿</Badge>
    )

  const flag = (icon: React.ReactNode, label: string) => (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex text-muted-foreground" aria-label={label} />}>{icon}</TooltipTrigger>
      <TooltipPopup>{label}</TooltipPopup>
    </Tooltip>
  )

  return (
    <>
      <TableRow>
        <TableCell className="max-w-0 whitespace-normal">
          <div className="min-w-0">
            <Link
              href={`/editor?edit=${post.slug}`}
              className="line-clamp-1 font-medium transition-colors hover:text-muted-foreground"
            >
              {post.title}
            </Link>
            {post.description && <p className="mt-0.5 line-clamp-1 text-muted-foreground text-xs">{post.description}</p>}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {statusBadge}
              {post.is_pinned === 1 && flag(<Pin className="size-3.5" aria-hidden="true" />, '已置顶')}
              {post.password && flag(<Lock className="size-3.5" aria-hidden="true" />, '已加密')}
              {post.is_hidden === 1 && flag(<EyeOff className="size-3.5" aria-hidden="true" />, '已隐藏')}
              {!isDeleted && <TranslationControl slug={post.slug} locked={Boolean(post.password)} info={translation} />}
            </div>
          </div>
        </TableCell>

        <TableCell className="hidden w-40 md:table-cell">
          <Dropdown
            options={categoryOptions}
            value={post.category || ''}
            onChange={(value) => update({ category: value || null }, '分类已更新', '更新失败')}
            placeholder="未分类"
            className="w-full"
            disabled={loading || isDeleted}
          />
        </TableCell>

        <TableCell className="hidden w-24 text-right sm:table-cell">
          <div className="tabular-nums">{post.view_count.toLocaleString()}</div>
          <div className="text-muted-foreground text-xs">{formatDate(post.published_at)}</div>
        </TableCell>

        <TableCell className="w-28">
          <div className="flex items-center justify-end gap-1">
            {isDeleted ? (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="恢复为草稿"
                  disabled={loading}
                  onClick={() => update({ status: 'draft' }, '已恢复为草稿', '恢复失败')}
                >
                  <ArchiveRestore aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="永久删除"
                  disabled={loading}
                  className="text-destructive-foreground"
                  onClick={() => setDialog('permanent')}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </>
            ) : (
              <>
                <Button render={<Link href={`/editor?edit=${post.slug}`} />} variant="ghost" size="icon-sm" aria-label="编辑">
                  <Pencil aria-hidden="true" />
                </Button>
                <Menu>
                  <MenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="更多操作" />}>
                    <MoreHorizontal aria-hidden="true" />
                  </MenuTrigger>
                  <MenuPopup align="end">
                    <MenuItem onClick={() => window.open(articleUrl, '_blank')}>
                      <ExternalLink aria-hidden="true" />
                      查看文章
                    </MenuItem>
                    <MenuItem onClick={copyLink}>
                      <Link2 aria-hidden="true" />
                      复制链接
                    </MenuItem>
                    <MenuSeparator />
                    <MenuItem onClick={() => setDialog('pin')}>
                      {post.is_pinned === 1 ? <PinOff aria-hidden="true" /> : <Pin aria-hidden="true" />}
                      {post.is_pinned === 1 ? '取消置顶' : '置顶'}
                    </MenuItem>
                    <MenuItem onClick={() => setDialog('hidden')}>
                      {post.is_hidden === 1 ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                      {post.is_hidden === 1 ? '取消隐藏' : '隐藏'}
                    </MenuItem>
                    <MenuItem onClick={() => setDialog('password')}>
                      {post.password ? <Lock aria-hidden="true" /> : <Unlock aria-hidden="true" />}
                      {post.password ? '管理密码' : '设置密码'}
                    </MenuItem>
                    <MenuItem onClick={() => setDialog('status')}>
                      {post.status === 'published' ? <FileText aria-hidden="true" /> : <Check aria-hidden="true" />}
                      {post.status === 'published' ? '转为草稿' : '发布'}
                    </MenuItem>
                    <MenuSeparator />
                    <MenuItem variant="destructive" onClick={() => setDialog('delete')}>
                      <Trash2 aria-hidden="true" />
                      删除
                    </MenuItem>
                  </MenuPopup>
                </Menu>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>

      <PasswordModal
        isOpen={dialog === 'password'}
        onClose={() => setDialog(null)}
        slug={post.slug}
        currentPassword={post.password}
        articleUrl={baseArticleUrl}
        onSuccess={() => router.refresh()}
      />

      <Modal
        isOpen={dialog === 'pin'}
        onClose={() => setDialog(null)}
        onConfirm={() => update({ is_pinned: post.is_pinned === 1 ? 0 : 1 }, post.is_pinned === 1 ? '已取消置顶' : '已置顶')}
        title={post.is_pinned === 1 ? '取消置顶' : '置顶文章'}
        description={post.is_pinned === 1 ? '确定要取消置顶吗？' : '置顶后文章将显示在列表顶部。'}
        closeOnConfirm={false}
      />

      <Modal
        isOpen={dialog === 'hidden'}
        onClose={() => setDialog(null)}
        onConfirm={() => update({ is_hidden: post.is_hidden === 1 ? 0 : 1 }, post.is_hidden === 1 ? '已取消隐藏' : '已隐藏')}
        title={post.is_hidden === 1 ? '取消隐藏' : '隐藏文章'}
        description={
          post.is_hidden === 1
            ? '取消隐藏后，文章将重新出现在首页、RSS 和搜索结果中。'
            : '隐藏后，文章不会在首页、RSS 和搜索中显示，但可以通过直接链接访问。'
        }
        closeOnConfirm={false}
      />

      <Modal
        isOpen={dialog === 'status'}
        onClose={() => setDialog(null)}
        onConfirm={() =>
          update(
            { status: post.status === 'published' ? 'draft' : 'published' },
            post.status === 'published' ? '已转为草稿' : '已发布',
          )
        }
        title={post.status === 'published' ? '转为草稿' : '发布文章'}
        description={post.status === 'published' ? '转为草稿后，文章将不再公开显示。' : '发布后，文章将在首页和 RSS 中显示。'}
        closeOnConfirm={false}
      />

      <Modal
        isOpen={dialog === 'delete'}
        onClose={() => setDialog(null)}
        onConfirm={() => update({ status: 'deleted' }, '已删除（可恢复）', '删除失败')}
        title="删除文章"
        description={`确定要删除「${post.title}」吗？删除后可以在已删除列表中恢复。`}
        confirmText="删除"
        type="danger"
        closeOnConfirm={false}
      />

      <Modal
        isOpen={dialog === 'permanent'}
        onClose={() => setDialog(null)}
        onConfirm={permanentDelete}
        title="永久删除"
        description={`确定要永久删除「${post.title}」吗？此操作不可恢复！`}
        confirmText="永久删除"
        type="danger"
        closeOnConfirm={false}
      />
    </>
  )
}
