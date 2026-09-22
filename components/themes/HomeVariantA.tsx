'use client'

// 书架首页：Hero + 按年书架 + 日记丛书

import Link from 'next/link'
import { SiteShell } from '@/components/SiteShell'
import { Bookshelf, type ShelfBook } from '@/components/Bookshelf'
import { Pagination } from '@/components/Pagination'
import { PostTypeBadge } from '@/components/PostTypeBadge'
import { PostUpdateBadge } from '@/components/PostUpdateBadge'
import { SubscribeForm } from '@/components/SubscribeForm'
import type { HomeProps } from '@/components/HomeClient'

function formatDateShort(ts: number) {
  const d = new Date(ts * 1000)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}

function formatDiarySpine(ts: number) {
  const d = new Date(ts * 1000)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${m}${day}`
}

export function HomeVariantA({
  posts,
  navLinks,
  currentPage,
  totalPages,
  initialTheme,
  diaryEntries = [],
}: HomeProps) {
  const byYear = new Map<number, ShelfBook[]>()

  for (const post of posts) {
    const year = new Date(post.published_at * 1000).getFullYear()
    const book: ShelfBook = {
      key: post.slug,
      href: `/${post.slug}`,
      title: post.title,
      spineText: post.title,
      meta: (
        <>
          {post.category ? <span>{post.category}</span> : null}
          <span>{formatDateShort(post.published_at)}</span>
        </>
      ),
      badges: (
        <>
          <PostTypeBadge type={post.post_type} />
          <PostUpdateBadge post={post} />
          {post.is_pinned === 1 ? <span className="kami-tag">置顶</span> : null}
          {post.password ? <span className="kami-tag">加密</span> : null}
        </>
      ),
    }
    const list = byYear.get(year)
    if (list) list.push(book)
    else byYear.set(year, [book])
  }

  const yearBlocks = Array.from(byYear.entries())

  const diaryBooks: ShelfBook[] = diaryEntries.map((entry) => ({
    key: `diary-${entry.slug}`,
    href: `/diary/${entry.slug}`,
    title: entry.title?.trim() || formatDateShort(entry.published_at),
    spineText: formatDiarySpine(entry.published_at),
    meta: <span>{formatDateShort(entry.published_at)}</span>,
    series: true,
    height: 150,
  }))

  return (
    <SiteShell navLinks={navLinks} initialTheme={initialTheme} mainClassName="kami-home-main">
      <header className="kami-page-header shelf-hero">
        <p className="kami-label">XuYi · 文集与札记</p>
        <h1 className="kami-display">书架</h1>
        <p className="kami-lead">
          每篇文章是一本书。日记是丛书。悬停抽出，点击翻开。
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="kami-empty">还没有文章</p>
      ) : (
        <>
          {yearBlocks.map(([year, books]) => (
            <Bookshelf key={year} label={`Shelf · ${year}`} books={books} />
          ))}

          {diaryBooks.length > 0 && (
            <div className="shelf-after">
              <Bookshelf label="Shelf · 日记丛书" books={diaryBooks} />
              <p className="kami-empty" style={{ marginTop: '1.25rem' }}>
                <Link href="/diary">全部日记 →</Link>
              </p>
            </div>
          )}

          <div className="shelf-after">
            <SubscribeForm />
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            basePath="/"
          />
        </>
      )}
    </SiteShell>
  )
}
