'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { Dropdown } from '@/components/admin/Dropdown'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface FilterBarProps {
  currentStatus?: string
  currentCategory?: string
  categories: string[]
  initialQuery?: string
  counts: {
    all: number
    published: number
    draft: number
    deleted: number
    encrypted: number
    unlisted: number
    pinned: number
  }
  resultCount: number
}

export function FilterBar({ currentStatus, currentCategory, categories, initialQuery = '', counts, resultCount }: FilterBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(initialQuery)

  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  function push(params: URLSearchParams) {
    const qs = params.toString()
    router.push(`/admin/posts${qs ? `?${qs}` : ''}`)
  }

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') params.delete(key)
    else params.set(key, value)
    push(params)
  }

  function setSearch(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set('q', value)
    else params.delete('q')
    push(params)
  }

  const activeStatus = currentStatus || 'all'
  const activeCategory = currentCategory || 'all'
  const hasActiveFilters = Boolean(query.trim() || activeStatus !== 'all' || activeCategory !== 'all')

  const categoryOptions = [{ value: 'all', label: '全部分类' }, ...categories.map((cat) => ({ value: cat, label: cat }))]

  const statusItems = [
    { value: 'all', label: '全部', count: counts.all },
    { value: 'published', label: '已发布', count: counts.published },
    { value: 'draft', label: '草稿', count: counts.draft },
    { value: 'deleted', label: '已删除', count: counts.deleted },
    { value: 'encrypted', label: '加密', count: counts.encrypted },
    { value: 'unlisted', label: '隐藏', count: counts.unlisted },
    { value: 'pinned', label: '置顶', count: counts.pinned },
  ] as const

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <form
          className="relative flex-1"
          onSubmit={(event) => {
            event.preventDefault()
            setSearch(query.trim())
          }}
        >
          <Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题、摘要或正文…"
            aria-label="搜索文章"
            className="[&_input]:ps-8"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setSearch('')
              }}
              className="absolute top-1/2 right-2 z-10 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="清除搜索"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </form>

        <div className="flex items-center gap-2">
          <div className="w-44">
            <Dropdown
              options={categoryOptions}
              value={activeCategory}
              onChange={(value) => updateFilter('category', value)}
              placeholder="全部分类"
              className="w-full"
            />
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={() => {
                setQuery('')
                router.push('/admin/posts')
              }}
            >
              清空筛选
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {statusItems.map((item) => {
            const active = activeStatus === item.value
            return (
              <Button
                key={item.value}
                size="sm"
                variant={active ? 'secondary' : 'ghost'}
                aria-pressed={active}
                className={active ? 'font-semibold' : 'text-muted-foreground'}
                onClick={() => updateFilter('status', item.value)}
              >
                {item.label}
                <Badge variant={active ? 'default' : 'outline'} size="sm" className="tabular-nums">
                  {item.count}
                </Badge>
              </Button>
            )
          })}
        </div>
        <span className="text-muted-foreground text-xs">当前结果 {resultCount} 篇</span>
      </div>
    </div>
  )
}
