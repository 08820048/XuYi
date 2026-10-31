import { describe, expect, it } from 'vitest'
import { getActiveSponsors, SPONSORS } from '@/lib/sponsor'

describe('sponsor visibility', () => {
  it('hides each sponsor at expiration', () => {
    for (const s of SPONSORS) {
      expect(getActiveSponsors(s.expiresAt - 1)).toContain(s)
      expect(getActiveSponsors(s.expiresAt)).not.toContain(s)
    }
  })

  it('shows OmniSpace only from 2026-11-01 until 2027-05-01 (UTC+8)', () => {
    const omni = SPONSORS.find((s) => s.name.startsWith('OmniSpace'))!
    expect(getActiveSponsors(omni.startsAt - 1)).not.toContain(omni)
    expect(getActiveSponsors(omni.startsAt)).toContain(omni)
  })
})
