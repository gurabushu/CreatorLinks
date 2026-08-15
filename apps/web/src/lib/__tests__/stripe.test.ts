import { describe, it, expect } from 'vitest'
import {
  PLATFORM_FEE_RATE,
  PLATFORM_FEE_RATE_PRO,
  calcArtistPayout,
  calcPlatformFee,
} from '../stripe'

describe('PLATFORM_FEE_RATE', () => {
  it('README と一致する 7%', () => {
    expect(PLATFORM_FEE_RATE).toBe(0.07)
  })

  it('PRO 用は 5%', () => {
    expect(PLATFORM_FEE_RATE_PRO).toBe(0.05)
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

describe('PRO 手数料減額 (isProArtist: true)', () => {
  it('5% を Math.round で丸める', () => {
    expect(calcPlatformFee(10000, { isProArtist: true })).toBe(500)
    expect(calcPlatformFee(10009, { isProArtist: true })).toBe(500) // 500.45 → 500
    expect(calcPlatformFee(10010, { isProArtist: true })).toBe(501) // 500.50 → 501
  })

  it('payout は 95% 相当', () => {
    expect(calcArtistPayout(10000, { isProArtist: true })).toBe(9500)
    expect(calcArtistPayout(30000, { isProArtist: true })).toBe(28500)
  })

  it('総額 30,000 円で 7% → 5% にすると受取が 600 円増える', () => {
    const budget = 30000
    const generalPayout = calcArtistPayout(budget)
    const proPayout = calcArtistPayout(budget, { isProArtist: true })
    expect(proPayout - generalPayout).toBe(600)
  })

  it('opts なし = 従来 7% と同じ (既存挙動を壊さない)', () => {
    for (const amount of [1000, 10000, 100000]) {
      expect(calcPlatformFee(amount)).toBe(calcPlatformFee(amount, { isProArtist: false }))
      expect(calcArtistPayout(amount)).toBe(calcArtistPayout(amount, { isProArtist: false }))
    }
  })

  it('PRO 版でも fee + payout === amount', () => {
    for (const amount of [1, 100, 999, 1000, 12345, 99999, 1_000_000, 1_234_567]) {
      const fee = calcPlatformFee(amount, { isProArtist: true })
      const payout = calcArtistPayout(amount, { isProArtist: true })
      expect(fee + payout).toBe(amount)
    }
  })
})
