'use client'

import Link from 'next/link'
import { Suspense, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardPanel } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

function AdminLoginForm() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!password) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await res.json().catch(() => null) as { error?: string } | null

      if (res.ok) {
        const redirectTo = searchParams.get('redirect_to') || '/admin'
        // 安全检查：只允许跳转到本站路径
        const safePath = redirectTo.startsWith('/') ? redirectTo : '/admin'
        router.push(safePath)
        router.refresh()
      } else {
        setError(
          typeof data?.error === 'string'
            ? data.error
            : res.status === 401
              ? '密码错误，请重试'
              : '登录服务暂不可用，请稍后重试'
        )
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="coss-admin flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-medium text-4xl tracking-tight" style={{ fontFamily: '"Newsreader", Georgia, serif' }}>
            Xu<i className="text-muted-foreground">Yi</i>
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">管理后台</p>
        </div>

        <Card>
          <CardPanel className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field invalid={Boolean(error)}>
                <FieldLabel>管理密码</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) setError('')
                  }}
                  placeholder="请输入管理密码"
                  autoFocus
                  autoComplete="current-password"
                />
                {error && <FieldError match>{error}</FieldError>}
              </Field>

              <Button type="submit" className="w-full" loading={loading} disabled={!password}>
                登录
              </Button>
            </form>
          </CardPanel>
        </Card>

        <p className="mt-6 text-center text-muted-foreground text-xs">
          <Link href="/" className="transition-colors hover:text-foreground">
            ← 返回博客首页
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function AdminLogin() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  )
}
