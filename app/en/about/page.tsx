import { AboutView } from '@/components/pages/AboutView'

export const metadata = {
  title: 'About',
  description: 'About XuYi and the author of this site.',
}

export const dynamic = 'force-dynamic'

export default function EnglishAboutPage() {
  return <AboutView lang="en" />
}
