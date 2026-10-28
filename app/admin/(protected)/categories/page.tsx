import { getCategories } from '@/lib/db'
import { getAppCloudflareEnv } from '@/lib/cloudflare'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { CategoryManager } from './CategoryManager'

export const metadata = { title: '分类管理' }

export default async function CategoriesPage() {
  const env = await getAppCloudflareEnv()
  let categories: Awaited<ReturnType<typeof getCategories>> = []

  if (env?.DB) {
    try {
      categories = await getCategories(env.DB)
    } catch (error) {
      console.error('Categories fetch error:', error)
    }
  }

  return (
    <div>
      <AdminPageHeader title="分类" description={`共 ${categories.length} 个分类`} />
      <CategoryManager initialCategories={categories} />
    </div>
  )
}

