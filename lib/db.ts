export { getDB, ensureSchema, type Database } from '@/lib/repositories/schema'
export {
  isPubliclyAccessiblePost,
  type CategoryRow,
  type CountRow,
  type DiaryEntry,
  type FriendLinkRow,
  type Post,
  type PostAiSnapshotRow,
  type PostCategoryRow,
  type PostWithTags,
  type SettingRow,
  type StatsRow,
} from '@/lib/repositories/types'
export {
  createDiaryEntry,
  deleteDiaryEntry,
  getDiaryEntries,
  getDiaryEntriesCount,
  getDiaryEntryBySlug,
  incrementDiaryEntryViewCount,
  isPubliclyAccessibleDiaryEntry,
  updateDiaryEntryBySlug,
} from '@/lib/repositories/diary'
export type { DiaryStatus } from '@/lib/repositories/diary'
export { mapPostWithTags, normalizePostStatus, parsePostTags } from '@/lib/repositories/post-mappers'
export {
  createPost,
  deletePost,
  getPostAiSnapshot,
  getPostBySlug,
  getPosts,
  getPostsByCategory,
  getPostsCount,
  getPostsCountByCategory,
  getStats,
  incrementViewCount,
  permanentlyDeletePost,
  restorePost,
  updatePost,
  updatePostBySlug,
} from '@/lib/repositories/posts'
export { searchPosts } from '@/lib/repositories/search'
export {
  createCategory,
  deleteCategory,
  getCategories,
  getPublicCategories,
  updateCategory,
} from '@/lib/repositories/categories'
export {
  createFriendLink,
  deleteFriendLink,
  getFriendLinks,
  getPublicFriendLinks,
  updateFriendLink,
  type FriendLinkInput,
} from '@/lib/repositories/friend-links'
export { getSetting, setSetting } from '@/lib/repositories/settings'
