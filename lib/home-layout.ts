export const HOME_LAYOUT_STORAGE_KEY = 'qm_home_layout'
export const HOME_LAYOUT_COOKIE = 'qm_home_layout'
export const HOME_LAYOUT_EVENT = 'qm-home-layout-change'

export type HomeLayout = 'shelf' | 'list'

export function parseHomeLayout(value: string | null | undefined): HomeLayout {
  return value === 'list' ? 'list' : 'shelf'
}

export function getHomeLayout(): HomeLayout {
  if (typeof window === 'undefined') return 'shelf'
  return parseHomeLayout(window.localStorage.getItem(HOME_LAYOUT_STORAGE_KEY))
}

export function setHomeLayout(layout: HomeLayout) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(HOME_LAYOUT_STORAGE_KEY, layout)
  document.cookie = `${HOME_LAYOUT_COOKIE}=${layout}; path=/; max-age=31536000; samesite=lax`
  window.dispatchEvent(new Event(HOME_LAYOUT_EVENT))
}

export function subscribeHomeLayout(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = () => onStoreChange()
  window.addEventListener(HOME_LAYOUT_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(HOME_LAYOUT_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}
