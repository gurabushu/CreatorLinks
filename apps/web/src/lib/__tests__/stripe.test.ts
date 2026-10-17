import { describe, it, expect } from 'vitest'
import {
  PLATFORM_FEE_RATE,
  PLATFORM_FEE_RATE_PRO,
  calcArtistPayout,
  calcPlatformFee,
} from '../stripe'

// 2026-10-17 fee-only pivot: PRO 手数料減額は廃止。全員 7%、Founding Supporter のみ 0%。

describe('PLATFORM_FEE_RATE', () => {
  it('README と一致する 7%', () => {
    expect(PLATFORM_FEE_RATE).toBe(0.07)
  })

  it('PLATFORM_FEE_RATE_PRO は deprecated、PLATFORM_FEE_RATE と同じ 7% を返す', () => {
    expect(PLATFORM_FEE_RATE_PRO).toBe(0.07)
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

describe('isProArtist opt は後方互換のため受け取るが無視される', () => {
  it('isProArtist=true でも 7% のまま', () => {
    expect(calcPlatformFee(10000, { isProArtist: true })).toBe(700)
    expect(calcArtistPayout(10000, { isProArtist: true })).toBe(9300)
  })

  it('isProArtist の有無で結果は変わらない', () => {
    for (const amount of [1000, 10000, 100000]) {
      expect(calcPlatformFee(amount)).toBe(calcPlatformFee(amount, { isProArtist: true }))
      expect(calcArtistPayout(amount)).toBe(calcArtistPayout(amount, { isProArtist: true }))
    }
  })
})

describe('Founding Supporter 枠 (isFounderExempt: true)', () => {
  it('金額に関わらず fee は 0', () => {
    for (const amount of [1, 999, 10000, 1_234_567]) {
      expect(calcPlatformFee(amount, { isFounderExempt: true })).toBe(0)
    }
  })

  it('payout は amount と一致（100% 受取）', () => {
    expect(calcArtistPayout(10000, { isFounderExempt: true })).toBe(10000)
    expect(calcArtistPayout(30000, { isFounderExempt: true })).toBe(30000)
  })

  it('isProArtist と併用しても fee=0 が優先', () => {
    expect(calcPlatformFee(10000, { isProArtist: true, isFounderExempt: true })).toBe(0)
    expect(calcArtistPayout(10000, { isProArtist: true, isFounderExempt: true })).toBe(10000)
  })
})
