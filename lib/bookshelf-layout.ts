export const BOOKS_PER_LAYER = 12
export const LAYERS_PER_PAGE = 5
export const POSTS_PER_SHELF_PAGE = BOOKS_PER_LAYER * LAYERS_PER_PAGE

export function chunkIntoLayers<T>(items: readonly T[], size = BOOKS_PER_LAYER): T[][] {
  const layers: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    layers.push(items.slice(i, i + size))
  }
  return layers
}

export function shelfYearLabel(timestamps: readonly number[]): string {
  if (timestamps.length === 0) return 'Shelf'
  const years = timestamps.map((ts) => new Date(ts * 1000).getFullYear())
  const min = Math.min(...years)
  const max = Math.max(...years)
  return min === max ? `Shelf · ${min}` : `Shelf · ${min}–${max}`
}
