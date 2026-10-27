import { LinksView } from '@/components/pages/LinksView'

export const metadata = {
  title: 'Links',
  description: 'Friends and sites worth a visit.',
}

export const dynamic = 'force-dynamic'

export default function EnglishLinksPage() {
  return <LinksView lang="en" />
}
