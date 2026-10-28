'use client'

import { useState, useEffect } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import { useToast } from '@/components/admin/toast'
import { Modal } from '@/components/admin/Modal'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface Token {
  id: number
  name: string
  token_preview: string
  created_at: number
  last_used_at: number | null
  is_active: number
}

interface TokensResponse {
  tokens: Token[]
}

interface CreateTokenResponse {
  token: string
}

export function ApiTokensManager() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<{ id: number; name: string } | null>(null)
  const toast = useToast()

  const loadTokens = async () => {
    try {
      const res = await fetch('/api/admin/tokens')
      if (res.ok) {
        const data = (await res.json()) as TokensResponse
        setTokens(data.tokens)
      }
    } catch {}
  }

  useEffect(() => { loadTokens() }, [])

  const createToken = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/admin/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (!res.ok) throw new Error('创建失败')
      const data = (await res.json()) as CreateTokenResponse
      setNewToken(data.token)
      setNewName('')
      toast.success('Token 已创建')
      loadTokens()
    } catch {
      toast.error('创建 Token 失败')
    } finally {
      setCreating(false)
    }
  }

  const deleteToken = async (id: number) => {
    try {
      const res = await fetch('/api/admin/tokens', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error('删除失败')
      toast.success('Token 已删除')
      loadTokens()
      return true
    } catch {
      toast.error('删除失败')
      return false
    }
  }

  const copyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token)
      toast.success('已复制到剪贴板')
    } catch {
      toast.error('复制失败')
    }
  }

  const formatDate = (ts: number | null) => {
    if (!ts) return '从未'
    return new Date(ts * 1000).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-5">
      <p className="text-muted-foreground text-sm">API Token 用于 Obsidian 插件、Chrome 插件、Claude Skill 等外部工具发布文章。</p>

      {/* 新 Token 提示（只显示一次） */}
      {newToken && (
        <Alert variant="warning">
          <AlertTitle>Token 已创建！请立即复制保存，此后不再显示完整 Token。</AlertTitle>
          <AlertDescription>
            <div className="mt-2 flex w-full items-center gap-2">
              <code className="flex-1 break-all rounded-md border bg-background px-3 py-2 font-mono text-foreground text-sm">{newToken}</code>
              <Button size="sm" onClick={() => copyToken(newToken)}>
                <Copy aria-hidden="true" />
                复制
              </Button>
            </div>
            <Button variant="link" size="xs" className="mt-1 px-0" onClick={() => setNewToken(null)}>
              我已保存，关闭此提示
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* 创建新 Token */}
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createToken()}
          placeholder="Token 用途，如 Obsidian插件"
          aria-label="Token 用途"
        />
        <Button onClick={createToken} loading={creating} disabled={!newName.trim()}>
          生成 Token
        </Button>
      </div>

      {/* Token 列表 */}
      {tokens.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground text-sm">暂无 API Token</p>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>创建于</TableHead>
                <TableHead>最后使用</TableHead>
                <TableHead className="w-16 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="font-medium">{t.name}</div>
                    <code className="font-mono text-muted-foreground text-xs">{t.token_preview}</code>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(t.created_at)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(t.last_used_at)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="删除"
                        className="text-destructive-foreground"
                        onClick={() => setDeleting({ id: t.id, name: t.name })}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Modal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => (deleting ? deleteToken(deleting.id) : undefined)}
        title="删除 Token"
        description={`确定删除 Token “${deleting?.name}”？使用它的外部工具将立即失效。`}
        confirmText="删除"
        type="danger"
      />
    </div>
  )
}
