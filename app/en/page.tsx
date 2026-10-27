import { HomeView } from '@/components/pages/HomeView'
import { LOCALE_META, t } from '@/lib/i18n'
import { getSiteUrl } from '@/lib/site-config'

const BASE_URL = getSiteUrl()

export const revalidate = 3600
export const dynamicParams = true

export const metadata = {
  title: { absolute: 'XuYi' },
  description: t('en', 'siteDescription'),
  alternates: {
    canonical: `${BASE_URL}/en`,
    languages: {
      'zh-CN': BASE_URL,
      en: `${BASE_URL}/en`,
      'x-default': BASE_URL,
    },
  },
  openGraph: {
    locale: LOCALE_META.en.ogLocale,
    title: 'XuYi',
    description: t('en', 'siteDescription'),
    url: `${BASE_URL}/en`,
  },
}

export default async function EnglishHome({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>
}) {
  const { page, tab } = await searchParams
  return <HomeView page={page} tab={tab} lang="en" />
}
