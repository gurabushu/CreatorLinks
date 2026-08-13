import { describe, it, expect } from 'vitest'
import { PLATFORM_FEE_RATE, calcArtistPayout, calcPlatformFee } from '../stripe'

describe('PLATFORM_FEE_RATE', () => {
  it('README と一致する 7%', () => {
    expect(PLATFORM_FEE_RATE).toBe(0.07)
  })
})

describe('calcPlatformFee', () => {
  it('7% を Math.round で丸める', () => {
    expect(calcPlatformFee(10000)).toBe(700)
    expect(calcPlatformFee(10001)).toBe(700) // 700.07 → 700
    expect(calcPlatformFee(10008)).toBe(701) // 700.56 → 701
  })

  it('ゼロは 0', () => {
    expect(calcPlatformFee(0)).toBe(0)
  })

  it('高額でも整数を返す', () => {
    expect(calcPlatformFee(1_000_000)).toBe(70_000)
    expect(Number.isInteger(calcPlatformFee(1_234_567))).toBe(true)
  })
})

describe('calcArtistPayout', () => {
  it('総額 - platform fee', () => {
    expect(calcArtistPayout(10000)).toBe(9300)
    expect(calcArtistPayout(0)).toBe(0)
  })

  it('platform fee + payout === amount（丸め合致）', () => {
    for (const amount of [1, 100, 999, 1000, 12345, 99999, 1_000_000, 1_234_567]) {
      expect(calcPlatformFee(amount) + calcArtistPayout(amount)).toBe(amount)
    }
  })
})
