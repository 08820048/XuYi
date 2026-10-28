'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogDescription, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/admin/toast'
import { generatePassword } from '@/lib/password'

interface PasswordModalProps {
  isOpen: boolean
  onClose: () => void
  slug: string
  currentPassword: string | null
  articleUrl: string
  onSuccess: () => void
}

/** 文章密码保护弹窗（后台）。逻辑沿用原来的 PasswordModal，样式换成 coss 的 Dialog。 */
export function PasswordModal({ isOpen, onClose, slug, currentPassword, articleUrl, onSuccess }: PasswordModalProps) {
  const [password, setPassword] = useState(currentPassword || '')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<'url' | 'password' | null>(null)
  const toast = useToast()

  const isEncrypted = !!currentPassword

  async function handleToggleEncryption() {
    setLoading(true)
    try {
      const newPassword = isEncrypted ? null : generatePassword()
      const response = await fetch(`/api/admin/posts/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      if (!response.ok) throw new Error('密码设置失败')

      if (newPassword) {
        setPassword(newPassword)
        toast.success('已启用密码保护')
      } else {
        setPassword('')
        toast.success('已取消密码保护')
        onClose()
      }
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败')
    } finally {
      setLoading(false)
    }
  }

  async function copyToClipboard(text: string, type: 'url' | 'password') {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      toast.success('已复制到剪贴板')
      setTimeout(() => setCopied(null), 2000)
    } catch {
      toast.error('复制失败')
    }
  }

  const fullUrl = password ? `${articleUrl}?pwd=${encodeURIComponent(password)}` : articleUrl

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogTitle>密码保护</DialogTitle>
          <DialogDescription>
            {isEncrypted
              ? '这篇文章需要密码才能访问。'
              : '启用后，文章不会出现在首页、RSS 和搜索结果中，只能通过直接链接加密码访问。'}
          </DialogDescription>
        </DialogHeader>
        <DialogPanel className="space-y-4">
          {isEncrypted && (
            <>
              <Field>
                <FieldLabel>访问密码</FieldLabel>
                <div className="flex w-full gap-2">
                  <Input value={password} readOnly />
                  <Button variant="outline" onClick={() => copyToClipboard(password, 'password')}>
                    {copied === 'password' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                    复制
                  </Button>
                </div>
              </Field>
              <Field>
                <FieldLabel>分享链接（含密码）</FieldLabel>
                <div className="flex w-full gap-2">
                  <Input value={fullUrl} readOnly className="font-mono text-xs" />
                  <Button variant="outline" onClick={() => copyToClipboard(fullUrl, 'url')}>
                    {copied === 'url' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                    复制
                  </Button>
                </div>
              </Field>
            </>
          )}
          <Button
            variant={isEncrypted ? 'destructive-outline' : 'default'}
            className="w-full"
            loading={loading}
            onClick={handleToggleEncryption}
          >
            {isEncrypted ? '取消密码保护' : '启用密码保护'}
          </Button>
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  )
}
