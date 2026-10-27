import { LinksView } from '@/components/pages/LinksView'

export const metadata = {
  title: '友联',
  description: '一些值得顺路拜访的朋友与站点。',
}

export const dynamic = 'force-dynamic'

export default function LinksPage() {
  return <LinksView />
}
