'use client'

// 书架首页：Hero + 文章分层书架 + 日记丛书

import Link from 'next/link'
import { SiteShell } from '@/components/SiteShell'
import { Bookshelf, type ShelfBook } from '@/components/Bookshelf'
import { Pagination } from '@/components/Pagination'
import { PostTypeBadge } from '@/components/PostTypeBadge'
import { PostUpdateBadge } from '@/components/PostUpdateBadge'
import { SubscribeForm } from '@/components/SubscribeForm'
import type { HomeProps } from '@/components/HomeClient'
import { chunkIntoLayers, shelfYearLabel } from '@/lib/bookshelf-layout'

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

function toBook(post: HomeProps['posts'][number]): ShelfBook {
  return {
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
}

export function HomeVariantA({
  posts,
  navLinks,
  currentPage,
  totalPages,
  diaryEntries = [],
}: HomeProps) {
  const layers = chunkIntoLayers(posts)

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
    <SiteShell navLinks={navLinks} mainClassName="kami-home-main">
      {posts.length === 0 ? (
        <p className="kami-empty">还没有文章</p>
      ) : (
        <>
          {layers.map((layerPosts) => (
            <Bookshelf
              key={layerPosts[0]?.slug ?? 'empty'}
              label={shelfYearLabel(layerPosts.map((post) => post.published_at))}
              books={layerPosts.map(toBook)}
            />
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
