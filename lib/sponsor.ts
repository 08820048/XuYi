export type Sponsor = {
  name: string
  url: string
  startsAt: number
  expiresAt: number
}

// 赞助位：到期自动下架（startsAt 之前也不显示）
export const SPONSORS: Sponsor[] = [
  {
    name: 'AI简历',
    url: 'https://bufancv.com',
    startsAt: 0,
    expiresAt: Date.parse('2027-08-20T23:02:03+08:00'),
  },
  {
    name: 'OmniSpace AI短剧创作',
    url: 'http://47.243.154.3/',
    startsAt: Date.parse('2026-11-01T00:00:00+08:00'),
    expiresAt: Date.parse('2027-05-01T00:00:00+08:00'),
  },
]

export function getActiveSponsors(now = Date.now()) {
  return SPONSORS.filter((s) => now >= s.startsAt && now < s.expiresAt)
}
