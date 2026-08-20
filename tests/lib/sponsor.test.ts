import { describe, expect, it } from 'vitest'
import { isSponsorActive, SPONSOR_EXPIRES_AT } from '@/lib/sponsor'

describe('sponsor visibility', () => {
  it('hides the sponsor at expiration', () => {
    expect(isSponsorActive(SPONSOR_EXPIRES_AT - 1)).toBe(true)
    expect(isSponsorActive(SPONSOR_EXPIRES_AT)).toBe(false)
  })
})
