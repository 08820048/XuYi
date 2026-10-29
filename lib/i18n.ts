export const LOCALES = ['zh', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'zh'

/** 有独立 URL 前缀、且文章可挂译文的非默认语言 */
export const TRANSLATION_LANGS = ['en'] as const

export const LOCALE_META: Record<Locale, { htmlLang: string; dateLocale: string; ogLocale: string; label: string }> = {
  zh: { htmlLang: 'zh-CN', dateLocale: 'zh-CN', ogLocale: 'zh_CN', label: '中文' },
  en: { htmlLang: 'en', dateLocale: 'en-US', ogLocale: 'en_US', label: 'EN' },
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

export function isTranslationLang(value: unknown): value is (typeof TRANSLATION_LANGS)[number] {
  return typeof value === 'string' && (TRANSLATION_LANGS as readonly string[]).includes(value)
}

function isExternal(path: string) {
  return /^([a-z][a-z0-9+.-]*:|\/\/|#|mailto:)/i.test(path)
}

/** 从 pathname 推断语言：/en 或 /en/... 为英文，其余为中文 */
export function localeFromPathname(pathname: string | null | undefined): Locale {
  if (!pathname) return DEFAULT_LOCALE
  return pathname === '/en' || pathname.startsWith('/en/') ? 'en' : DEFAULT_LOCALE
}

/** 去掉语言前缀，返回中文版（默认语言）下的路径 */
export function stripLocalePrefix(pathname: string): string {
  if (pathname === '/en') return '/'
  if (pathname.startsWith('/en/')) return pathname.slice(3)
  return pathname
}

/** 给站内路径加上语言前缀；外链、锚点原样返回。保留 query / hash。 */
export function localePath(path: string, locale: Locale): string {
  if (isExternal(path) || !path.startsWith('/')) return path
  const base = stripLocalePrefix(path.split(/[?#]/, 1)[0])
  const rest = path.slice(path.split(/[?#]/, 1)[0].length)
  if (locale === DEFAULT_LOCALE) return `${base}${rest}`
  return `${base === '/' ? '/en' : `/en${base}`}${rest}`
}

/** 当前页面在另一种语言下的路径（用于语言切换、hreflang） */
export function alternatePath(pathname: string, target: Locale): string {
  return localePath(stripLocalePrefix(pathname), target)
}

const zh = {
  // 通用
  home: '首页',
  backHome: '返回首页',
  viewAllPosts: '查看全部',
  heroRole: '独立产品 & 游戏开发者',
  footSite: '站内',
  footTop: '回到顶部',
  specProgress: '进度',
  specProgressValue: '{done} / {goal} 个产品，{percent}%',
  specFocus: '方向',
  specFocusValue: 'Mac 工具 · AI · 游戏',
  specPrinciple: '原则',
  specPrincipleValue: '每一个都从解决自己的需求开始',
  specContact: '联系',
  indexTitle: '一百个产品',
  indexHint: '悬停或点击格子查看',
  legendLive: '已上线',
  legendNext: '下一个',
  legendTodo: '待做',
  timeAria: '时间进度',
  timeToday: '今天',
  timeWeek: '本周',
  timeMonth: '本月',
  timeYear: '今年',
  notFoundTitle: '页面不存在',
  notFoundLead: '这个地址没有对应的内容，可能是链接写错了，或者文章已被移动。',
  search: '搜索',
  searchArticles: '搜索文章',
  searchPlaceholder: '搜索文章...',
  searching: '搜索中…',
  noResults: '没有找到相关文章',
  tryOtherKeywords: '试试其他关键词',
  searchShortcutSelect: '选择',
  searchShortcutOpen: '打开',
  searchShortcutClose: '关闭',
  openMenu: '打开菜单',
  closeMenu: '关闭菜单',
  switchLanguage: '切换语言',
  prevPage: '← 上一页',
  nextPage: '下一页 →',
  pagination: '分页导航',
  today: '今天',
  yesterday: '昨天',
  daysAgo: '{n}天前',
  // 页脚
  sponsor: '赞助',
  // 首页
  tabWork: '作品',
  tabWriting: '写作',
  contentSwitch: '内容切换',
  subscribe: '订阅',
  confirm: '确认',
  subscribed: '已订阅',
  emailLabel: '邮箱',
  invalidEmail: '请输入有效的邮箱地址。',
  submitFailed: '提交失败，请稍后重试。',
  networkError: '网络错误，请稍后重试。',
  noPostsYet: '还没有文章',
  noTranslatedPostsYet: '还没有英文文章',
  prevPageShort: '上一页',
  nextPageShort: '下一页',
  collabContact: '合作交流,请联系:',
  linksTitle: '友联',
  diaryTitle: '日记',
  aboutTitle: '关于我',
  latest: 'LATEST',
  visit: '访问',
  buy: '去购买',
  emailMe: '发邮件给 XuYi',
  planAria: '100 个产品计划进度',
  planDone: '已完成 {done} / {goal} 个产品',
  planNote: '每一个都从解决自己的需求开始。',
  // 文章
  articleKicker: '文章',
  readingMinutes: '{n} min',
  views: '{n} views',
  copyrightAndSource: '版权与来源',
  repostNotice: '原文著作权归原作者或相关权利人所有。本站仅在授权范围内转载，不代表原作者对本站观点或内容的认可。',
  translationNotice: '原作品著作权归原作者或相关权利人所有。本译文由本站完成，译文相关权利的行使仍受原作品授权条款约束。',
  sourceLink: '原文链接：',
  articleLink: '本文链接：',
  copyrightTitle: '版权声明',
  copyCitation: '复制引用',
  copied: '已复制',
  copyrightBody: '本文内容版权归作者或相关权利人所有。转载、引用或其他使用请遵循相应授权条款，并保留本文链接。',
  continueReading: '继续阅读',
  toc: '文章目录',
  tocChapter: '章节',
  tocSection: '小节',
  tocParagraph: '段落',
  postTypeOriginal: '原创',
  postTypeRepost: '转载',
  postTypeTranslation: '翻译',
  hasUpdate: '有更新',
  updatedOn: '更新于 {date}',
  encrypted: '加密',
  pinned: '置顶',
  downloadMarkdown: '下载 Markdown',
  copyWechat: '复制公众号格式',
  downloadPdf: '下载 PDF',
  // 订阅
  newsletter: 'Newsletter',
  subscribeSuccess: '订阅成功，下一篇文章发布时会通知你。',
  subscribeTitle: '订阅更新',
  subscribeLead: '新文章发布时收到邮件通知，随时可退订。',
  // 列表 / 页面
  linksLead: '一些值得顺路拜访的朋友与站点。',
  linksEmpty: '还没有公开显示的友联。',
  linksDbDown: '数据库暂不可用。',
  diaryLead: '零散的生活、临时的念头、照片和片段。',
  diaryEmpty: '还没有公开日记。',
  backToDiary: '返回日记',
  categoryCount: '共 {n} 篇文章',
  categoryEmpty: '这个分类下还没有公开文章。',
  searchResults: '搜索结果',
  searchKeyword: '关键词 “{q}” 找到 {n} 篇文章',
  searchEnterKeyword: '请输入搜索关键词',
  searchNoMatch: '未找到相关文章，试试其他关键词。',
  aboutDescription: '关于 XuYi 和站点作者。',
  siteDescription: '写游戏开发，也写 AI。',
  // 语言回退
  onlyChinese: '这篇文章暂时只有中文版。',
} as const

export type MessageKey = keyof typeof zh
type Messages = Record<MessageKey, string>

const en: Messages = {
  home: 'Home',
  backHome: 'Back to home',
  viewAllPosts: 'View all',
  heroRole: 'Indie product & game developer',
  footSite: 'Site',
  footTop: 'Back to top',
  specProgress: 'Progress',
  specProgressValue: '{done} / {goal} products, {percent}%',
  specFocus: 'Focus',
  specFocusValue: 'Mac tools · AI · Games',
  specPrinciple: 'Principle',
  specPrincipleValue: 'Every one starts from a problem of my own',
  specContact: 'Contact',
  indexTitle: 'One hundred products',
  indexHint: 'Hover or tap a square to look closer',
  legendLive: 'Shipped',
  legendNext: 'Next',
  legendTodo: 'To do',
  timeAria: 'Time progress',
  timeToday: 'Today',
  timeWeek: 'This week',
  timeMonth: 'This month',
  timeYear: 'This year',
  notFoundTitle: 'Page not found',
  notFoundLead: "There's nothing at this address. The link may be mistyped, or the article may have moved.",
  search: 'Search',
  searchArticles: 'Search articles',
  searchPlaceholder: 'Search articles...',
  searching: 'Searching…',
  noResults: 'No matching articles',
  tryOtherKeywords: 'Try different keywords',
  searchShortcutSelect: 'Select',
  searchShortcutOpen: 'Open',
  searchShortcutClose: 'Close',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
  switchLanguage: 'Switch language',
  prevPage: '← Previous',
  nextPage: 'Next →',
  pagination: 'Pagination',
  today: 'Today',
  yesterday: 'Yesterday',
  daysAgo: '{n}d ago',
  sponsor: 'Sponsor',
  tabWork: 'Work',
  tabWriting: 'Writing',
  contentSwitch: 'Switch content',
  subscribe: 'Subscribe',
  confirm: 'Confirm',
  subscribed: 'Subscribed',
  emailLabel: 'Email',
  invalidEmail: 'Please enter a valid email address.',
  submitFailed: 'Something went wrong. Please try again later.',
  networkError: 'Network error. Please try again later.',
  noPostsYet: 'No posts yet',
  noTranslatedPostsYet: 'No English posts yet',
  prevPageShort: 'Previous',
  nextPageShort: 'Next',
  collabContact: 'For collaboration, contact:',
  linksTitle: 'Links',
  diaryTitle: 'Diary',
  aboutTitle: 'About',
  latest: 'LATEST',
  visit: 'Visit',
  buy: 'Buy',
  emailMe: 'Email XuYi',
  planAria: '100 Products plan progress',
  planDone: '{done} of {goal} products shipped',
  planNote: 'Every one starts from solving my own problem.',
  articleKicker: 'Article',
  readingMinutes: '{n} min read',
  views: '{n} views',
  copyrightAndSource: 'Copyright & source',
  repostNotice: "Copyright of the original belongs to its author or rights holder. This site reposts it only within the scope of permission and does not imply the author's endorsement of this site.",
  translationNotice: 'Copyright of the original work belongs to its author or rights holder. This translation is produced by this site; its use remains subject to the original work\'s license terms.',
  sourceLink: 'Original: ',
  articleLink: 'Link to this article: ',
  copyrightTitle: 'Copyright',
  copyCitation: 'Copy citation',
  copied: 'Copied',
  copyrightBody: 'Copyright of this article belongs to its author or rights holder. When reposting or quoting, please follow the applicable license terms and keep the link to this article.',
  continueReading: 'Keep reading',
  toc: 'Contents',
  tocChapter: 'Chapter',
  tocSection: 'Section',
  tocParagraph: 'Paragraph',
  postTypeOriginal: 'Original',
  postTypeRepost: 'Repost',
  postTypeTranslation: 'Translation',
  hasUpdate: 'Updated',
  updatedOn: 'Updated {date}',
  encrypted: 'Locked',
  pinned: 'Pinned',
  downloadMarkdown: 'Download Markdown',
  copyWechat: 'Copy WeChat format',
  downloadPdf: 'Download PDF',
  newsletter: 'Newsletter',
  subscribeSuccess: "You're subscribed. We'll email you when the next article is published.",
  subscribeTitle: 'Subscribe',
  subscribeLead: 'Get an email when a new article is published. Unsubscribe anytime.',
  linksLead: 'Friends and sites worth a visit.',
  linksEmpty: 'No public links yet.',
  linksDbDown: 'Database is temporarily unavailable.',
  diaryLead: 'Scattered life, passing thoughts, photos and fragments.',
  diaryEmpty: 'No public diary entries yet.',
  backToDiary: 'Back to diary',
  categoryCount: '{n} articles',
  categoryEmpty: 'No public articles in this category yet.',
  searchResults: 'Search results',
  searchKeyword: '{n} articles found for “{q}”',
  searchEnterKeyword: 'Enter a keyword to search',
  searchNoMatch: 'No articles found. Try different keywords.',
  aboutDescription: 'About XuYi and the author of this site.',
  siteDescription: 'Writing about game development, and AI.',
  onlyChinese: 'This article is only available in Chinese for now.',
}

const MESSAGES: Record<Locale, Messages> = { zh, en }

export function t(locale: Locale, key: MessageKey, vars?: Record<string, string | number>): string {
  let text = MESSAGES[locale][key]
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
  }
  return text
}

/** 日期格式：中文 2026年10月27日，英文 Oct 27, 2026 */
export function formatLocaleDate(
  ts: number,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
): string {
  return new Date(ts * 1000).toLocaleDateString(LOCALE_META[locale].dateLocale, options)
}

/** 站点导航的标签来自后台设置（中文），英文下按已知标签翻译，其余原样 */
const NAV_LABELS_EN: Record<string, string> = {
  首页: 'Home',
  关于: 'About',
  关于我: 'About',
  友联: 'Links',
  友链: 'Links',
  日记: 'Diary',
  归档: 'Archive',
  文章: 'Articles',
  博客: 'Blog',
  作品: 'Work',
  写作: 'Writing',
  订阅: 'Subscribe',
}

export function localizeNavLabel(label: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return label
  return NAV_LABELS_EN[label.trim()] ?? label
}
