export const SPONSOR_EXPIRES_AT = Date.parse('2027-08-20T23:02:03+08:00')

export function isSponsorActive(now = Date.now()) {
  return now < SPONSOR_EXPIRES_AT
}
