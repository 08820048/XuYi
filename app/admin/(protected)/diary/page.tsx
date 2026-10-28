import Link from 'next/link'
import { BookOpen, PenLine } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getAppCloudflareEnv } from '@/lib/cloudflare'
import { getDiaryEntries } from '@/lib/db'
import { DiaryRow } from './DiaryRow'

export const metadata = { title: '日记管理' }

export default async function AdminDiaryPage() {
  let entries: Awaited<ReturnType<typeof getDiaryEntries>> = []

  try {
    const env = await getAppCloudflareEnv()
    if (env?.DB) {
      entries = await getDiaryEntries(env.DB, 200, 0, true, true, true)
    }
  } catch (error) {
    console.error('Diary fetch error:', error)
  }

  return (
    <div>
      <AdminPageHeader
        title="日记"
        description="记录日常、图片、视频和临时想法。"
        actions={
          <Button render={<Link href="/admin/diary/edit?new=1" />}>
            <PenLine aria-hidden="true" />
            写日记
          </Button>
        }
      />

      {entries.length === 0 ? (
        <Empty className="rounded-2xl border border-dashed py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>还没有日记</EmptyTitle>
            <EmptyDescription>写下第一条日记，记录今天的想法。</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标题</TableHead>
                <TableHead className="w-24">状态</TableHead>
                <TableHead className="w-28 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <DiaryRow key={entry.slug} entry={entry} />
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
