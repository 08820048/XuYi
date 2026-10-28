/** 让页面里的任何按钮都能唤起灵动岛搜索（⌘K 同样走这个事件）。 */
export const ISLAND_SEARCH_EVENT = 'island-search:open'

export function openIslandSearch() {
  window.dispatchEvent(new Event(ISLAND_SEARCH_EVENT))
}
