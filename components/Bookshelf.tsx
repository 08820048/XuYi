'use client'

import Link from 'next/link'
import { useState, type MouseEvent, type ReactNode } from 'react'

export interface ShelfBook {
  key: string
  href: string
  title: string
  spineText: string
  meta?: ReactNode
  badges?: ReactNode
  /** 0-1，用于在调色板里稳定取色 */
  colorSeed?: number
  /** 书高（px），日记丛书等可用统一矮书 */
  height?: number
  /** 是否属于丛书（统一色） */
  series?: boolean
}

const BOOK_PALETTE = [
  '#1b365d',
  '#c44a2a',
  '#504e49',
  '#2d5a8a',
  '#6b6a64',
  '#8a9bb3',
  '#1a1614',
  '#b7674e',
  '#3f5d52',
  '#7a6f68',
]

function hashSeed(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

interface TipState {
  title: string
  x: number
  y: number
  flip: boolean
}

export interface BookshelfProps {
  label: string
  books: ShelfBook[]
  emptyText?: string
}

export function Bookshelf({ label, books, emptyText }: BookshelfProps) {
  const [tip, setTip] = useState<TipState | null>(null)

  const showTip = (el: HTMLElement, title: string) => {
    const rect = el.getBoundingClientRect()
    setTip({
      title,
      x: rect.left + rect.width / 2,
      y: rect.top,
      flip: rect.top < 72,
    })
  }

  const handleBookClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return
    }
    setTip(null)
  }

  if (books.length === 0) {
    return (
      <section className="shelf-block" aria-label={label}>
        <div className="shelf-label">{label}</div>
        <p className="shelf-empty">{emptyText ?? '书架空空。'}</p>
      </section>
    )
  }

  return (
    <section className="shelf-block" aria-label={label}>
      <div className="shelf-label">{label}</div>
      <div className="shelf">
        {books.map((book) => {
          const seed = book.colorSeed ?? hashSeed(book.key)
          const color = book.series
            ? 'var(--editor-accent)'
            : BOOK_PALETTE[seed % BOOK_PALETTE.length]
          const height = book.height ?? 164 + (seed % 3) * 14

          return (
            <Link
              key={book.key}
              href={book.href}
              className="book"
              style={
                {
                  '--book-c': color,
                  '--book-h': `${height}px`,
                } as React.CSSProperties
              }
              aria-label={book.title}
              onClick={handleBookClick}
              onMouseEnter={(e) => showTip(e.currentTarget, book.title)}
              onMouseLeave={() => setTip(null)}
              onFocus={(e) => showTip(e.currentTarget, book.title)}
              onBlur={() => setTip(null)}
            >
              <span className="book-band" aria-hidden="true" />
              <span className="book-band book-band--b" aria-hidden="true" />
              <span className="book-spine" aria-hidden="true">
                <span>{book.spineText}</span>
              </span>
              <span className="book-peek" aria-hidden="true">
                <span className="book-peek-title">{book.title}</span>
                {book.meta ? <span className="book-peek-meta">{book.meta}</span> : null}
                {book.badges ? <span className="book-peek-badges">{book.badges}</span> : null}
              </span>
            </Link>
          )
        })}
      </div>

      {tip ? (
        <div
          className={`book-title-tip${tip.flip ? ' is-below' : ''}`}
          style={{ left: `${tip.x}px`, top: `${tip.y}px` }}
          role="tooltip"
        >
          {tip.title}
        </div>
      ) : null}
    </section>
  )
}
