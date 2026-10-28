'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { BookOpen, ExternalLink, FileText, Link2, LogOut, Menu, PenLine, Settings, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetPopup, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/admin/posts', label: '文章', icon: FileText },
  { href: '/admin/diary', label: '日记', icon: BookOpen },
  { href: '/admin/categories', label: '分类', icon: Tag },
  { href: '/admin/friend-links', label: '友联', icon: Link2 },
  { href: '/admin/settings', label: '设置', icon: Settings },
] as const

function Brand() {
  return (
    <Link href="/admin/posts" className="flex items-baseline gap-2 px-2">
      <span className="font-medium text-lg tracking-tight" style={{ fontFamily: '"Newsreader", Georgia, serif' }}>
        Xu<i className="text-muted-foreground">Yi</i>
      </span>
      <span className="text-muted-foreground text-xs">管理后台</span>
    </Link>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() || ''
  const router = useRouter()

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <div className="flex h-full flex-col gap-4 p-3">
      <div className="pt-1.5">
        <Brand />
      </div>

      <nav className="flex flex-col gap-0.5" aria-label="后台导航">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-sidebar-foreground outline-none transition-colors',
                'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring',
                active && 'bg-sidebar-accent text-sidebar-accent-foreground',
              )}
            >
              <Icon className="size-4 opacity-70" aria-hidden="true" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        <Button render={<Link href="/editor" onClick={onNavigate} />} className="w-full justify-start">
          <PenLine aria-hidden="true" />
          写文章
        </Button>
        <Button
          render={<Link href="/admin/diary/edit?new=1" onClick={onNavigate} />}
          variant="outline"
          className="w-full justify-start"
        >
          <PenLine aria-hidden="true" />
          写日记
        </Button>
        <Separator className="my-1" />
        <Button render={<Link href="/" onClick={onNavigate} />} variant="ghost" className="w-full justify-start text-muted-foreground">
          <ExternalLink aria-hidden="true" />
          查看博客
        </Button>
        <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={logout}>
          <LogOut aria-hidden="true" />
          退出登录
        </Button>
      </div>
    </div>
  )
}

/** 桌面端固定侧栏。 */
export function AdminSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[15rem] shrink-0 border-r bg-sidebar lg:block">
      <SidebarContent />
    </aside>
  )
}

/** 窄屏顶栏 + 抽屉菜单。 */
export function AdminMobileBar() {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b bg-background/85 px-3 backdrop-blur lg:hidden">
      <Brand />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="打开菜单" />}>
          <Menu aria-hidden="true" />
        </SheetTrigger>
        <SheetPopup side="left" showCloseButton={false} className="max-w-[16rem] bg-sidebar">
          <SheetTitle className="sr-only">后台导航</SheetTitle>
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetPopup>
      </Sheet>
    </header>
  )
}
