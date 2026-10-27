import { AboutView } from '@/components/pages/AboutView'

export const metadata = {
  title: '关于我',
  description: '关于 XuYi 和站点作者。',
}

export const dynamic = 'force-dynamic'

export default function AboutPage() {
  return <AboutView />
}
