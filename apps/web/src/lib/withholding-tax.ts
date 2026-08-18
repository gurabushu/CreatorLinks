// 源泉徴収税の目安計算（個人事業主・音楽演奏 / 制作系）
//
// 所得税法 204 条 1 項 5 号: 演奏・制作等の報酬は源泉徴収の対象。
// 税率:
//   支払額 100 万円以下: 10.21%（所得税 10% + 復興特別所得税 0.21%）
//   100 万円超の部分  : 20.42%
// これは「支払確定額」に対する目安であり、
//   - 依頼者が法人 or 一定条件の個人事業主のときに実際に源泉徴収される
//   - プラットフォーム介在の場合、実務では源泉徴収対象外扱いされることも多い
//   - あくまで確定申告時の参考値として提示（法的な源泉徴収額を保証するものではない）

const RATE_LOW = 0.1021 // 100 万円以下部分
const RATE_HIGH = 0.2042 // 100 万円超部分
const THRESHOLD = 1_000_000

/**
 * 支払確定額 (amountYen) から源泉徴収税の目安を算出。
 * 100 万円超の部分は 20.42% で計算する。
 * 円未満切り上げは実務で議論の余地があるが、ここは切り捨てで統一。
 */
export function calcWithholdingTax(amountYen: number): number {
  if (amountYen <= 0) return 0
  if (amountYen <= THRESHOLD) {
    return Math.floor(amountYen * RATE_LOW)
  }
  const low = Math.floor(THRESHOLD * RATE_LOW)
  const high = Math.floor((amountYen - THRESHOLD) * RATE_HIGH)
  return low + high
}
