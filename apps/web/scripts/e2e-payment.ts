/**
 * Stripe エスクロー案件決済 E2E テストスクリプト
 *
 * 目的: 「Match 承認 → 発注者支払い → HELD → 検収 → releasePayment → RELEASED」
 * 一連のフローを実際の Stripe test mode API で通し、DB 状態と Stripe 側の
 * Transfer 到達を verify する。
 *
 * 前提:
 *   1. `stripe login` 済み（test mode API key が有効・失効していない）
 *   2. apps/web/.env.local に STRIPE_SECRET_KEY (sk_test_...) が設定済み
 *   3. docker compose で local dev DB (creator_links_dev) が起動中
 *
 * 実行:
 *   pnpm --filter web e2e:payment
 *   または:  cd apps/web && npx tsx scripts/e2e-payment.ts
 *
 * 副作用:
 *   - Stripe test mode に Express Connect Account, PaymentIntent, Charge, Transfer を作成
 *     (Stripe test mode のリソースは Dashboard で確認可能。cleanup で削除)
 *   - local dev DB に E2E 用 User (email 接頭辞 `e2e-test-`) / Project / Match / Payment を作成
 *     (最後に cleanup で削除)
 *
 * Webhook 経路のテストではないため `stripe listen` は不要。Payment.status の遷移は
 * webhook 相当の updateMany を直接呼び出しでシミュレートする。
 */
// .env.local を明示的にロード (dotenv 標準は .env で、Next.js の .env.local は見に行かない)
import { config as loadEnv } from 'dotenv'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: join(__dirname, '..', '.env.local') })
loadEnv({ path: join(__dirname, '..', '.env') }) // fallback

import Stripe from 'stripe'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

// ANSI カラー（ターミナル表示用の小さなヘルパー）
const c = {
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
}

const step = (n: number, msg: string) => console.log(`\n${c.bold(`[${n}]`)} ${msg}`)
const ok = (msg: string) => console.log(`  ${c.green('✓')} ${msg}`)
const info = (msg: string) => console.log(`  ${c.gray('·')} ${c.gray(msg)}`)
function fail(msg: string): never {
  console.error(`  ${c.red('✗')} ${msg}`)
  throw new Error(msg)
}

// ---- 定数 ----
const BUDGET_YEN = 10000 // 手数料 7% で fee=700, payout=9300
const EXPECTED_FEE = 700
const EXPECTED_PAYOUT = 9300
const TEST_EMAIL_PREFIX = 'e2e-test-'
const TEST_MARKER = randomUUID().slice(0, 8) // 実行ごとにユニークな接頭辞
const CURRENCY = 'jpy' as const

// ---- Stripe / Prisma 初期化 ----
if (!process.env.STRIPE_SECRET_KEY) {
  console.error(c.red('STRIPE_SECRET_KEY が未設定です。'))
  console.error('  1. `stripe login` で test key を再取得')
  console.error('  2. `stripe config --list` で test_mode_api_key をコピー')
  console.error('  3. apps/web/.env.local の STRIPE_SECRET_KEY に貼付')
  process.exit(1)
}
if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
  fail('STRIPE_SECRET_KEY が本番キー (sk_live_) です。E2E は必ず test mode で実行してください。')
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-07-29.dahlia',
  typescript: true,
})
const prisma = new PrismaClient({ log: ['error'] })

// ---- テストデータのライフサイクル管理 ----
type Ctx = {
  buyerId?: string
  artistId?: string
  projectId?: string
  matchId?: string
  paymentId?: string
  artistConnectId?: string
  paymentIntentId?: string
  chargeId?: string
  transferId?: string
}

async function cleanup(ctx: Ctx) {
  step(99, c.gray('cleanup: DB とStripe test リソースを削除'))
  try {
    if (ctx.paymentId) {
      await prisma.payment.delete({ where: { id: ctx.paymentId } }).catch(() => null)
    }
    if (ctx.matchId) {
      await prisma.match.delete({ where: { id: ctx.matchId } }).catch(() => null)
    }
    if (ctx.projectId) {
      await prisma.project.delete({ where: { id: ctx.projectId } }).catch(() => null)
    }
    if (ctx.buyerId) {
      await prisma.user.delete({ where: { id: ctx.buyerId } }).catch(() => null)
    }
    if (ctx.artistId) {
      await prisma.user.delete({ where: { id: ctx.artistId } }).catch(() => null)
    }
    if (ctx.artistConnectId) {
      // Stripe test mode の Express account は API で削除可能
      await stripe.accounts.del(ctx.artistConnectId).catch(() => null)
    }
    // PaymentIntent / Charge / Transfer は Stripe test mode に残るが、
    // Dashboard から一括削除可能なため cleanup 対象外（監査用途にも便利）
    info('cleanup complete')
  } catch (e) {
    console.error(c.yellow('cleanup 中にエラー（部分的に残っている可能性）:'), e)
  } finally {
    await prisma.$disconnect()
  }
}

// ---- Main flow ----
async function main() {
  const ctx: Ctx = {}
  console.log(c.bold('=== Stripe エスクロー案件決済 E2E テスト ==='))
  info(`実行 ID: ${TEST_MARKER}  (email 接頭辞 ${TEST_EMAIL_PREFIX}${TEST_MARKER}-*)`)
  info(`予算: ¥${BUDGET_YEN.toLocaleString()} / 想定 手数料 ¥${EXPECTED_FEE.toLocaleString()} / 想定 受取 ¥${EXPECTED_PAYOUT.toLocaleString()}`)

  try {
    // -------- 1. Test artist (受注者) を作成 + Stripe Connect Express アカウント --------
    step(1, 'Test artist を作成 + Stripe Connect Express アカウント作成')
    const artistConnect = await stripe.accounts.create({
      type: 'express',
      country: 'JP',
      email: `${TEST_EMAIL_PREFIX}${TEST_MARKER}-artist@example.com`,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    })
    ctx.artistConnectId = artistConnect.id
    ok(`Connect account 作成: ${artistConnect.id}`)
    info(`  charges_enabled=${artistConnect.charges_enabled} / payouts_enabled=${artistConnect.payouts_enabled}`)
    // test mode では transfers capability が即座に active になる

    const artist = await prisma.user.create({
      data: {
        email: `${TEST_EMAIL_PREFIX}${TEST_MARKER}-artist@example.com`,
        name: `E2E Test Artist ${TEST_MARKER}`,
        role: 'GENERAL',
        stripeConnectAccountId: artistConnect.id,
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
        stripeOnboardingCompletedAt: new Date(),
      },
      select: { id: true },
    })
    ctx.artistId = artist.id
    ok(`DB user (artist) 作成: ${artist.id}`)

    // -------- 2. Test buyer (発注者) を作成 --------
    step(2, 'Test buyer を作成')
    const buyer = await prisma.user.create({
      data: {
        email: `${TEST_EMAIL_PREFIX}${TEST_MARKER}-buyer@example.com`,
        name: `E2E Test Buyer ${TEST_MARKER}`,
        role: 'GENERAL',
      },
      select: { id: true },
    })
    ctx.buyerId = buyer.id
    ok(`DB user (buyer) 作成: ${buyer.id}`)

    // -------- 3. Test Project + Match(ACCEPTED) を作成 --------
    step(3, 'Test Project + Match(ACCEPTED) を作成')
    const project = await prisma.project.create({
      data: {
        clientId: buyer.id,
        title: `E2E Test Project ${TEST_MARKER}`,
        description: 'E2E テスト用の案件。cleanup で削除される。',
        genres: ['test'],
        budget: BUDGET_YEN,
        contractType: 'SPOT',
        commitmentLevel: 'HOBBY',
        status: 'MATCHING',
      },
      select: { id: true },
    })
    ctx.projectId = project.id

    const match = await prisma.match.create({
      data: {
        projectId: project.id,
        artistId: artist.id,
        status: 'ACCEPTED',
      },
      select: { id: true },
    })
    ctx.matchId = match.id
    ok(`Project ${project.id} / Match ${match.id}`)

    // -------- 4. PaymentIntent を作成して決済（test カードで即 confirm）--------
    step(4, 'PaymentIntent 作成 + test カードで confirm')
    // Payment レコードを先に作る（本番では createCheckoutSessionAction がやること）
    const payment = await prisma.payment.create({
      data: {
        matchId: match.id,
        amountYen: BUDGET_YEN,
        platformFeeYen: EXPECTED_FEE,
        artistPayoutYen: EXPECTED_PAYOUT,
        currency: CURRENCY,
        status: 'AWAITING',
      },
      select: { id: true },
    })
    ctx.paymentId = payment.id

    const pi = await stripe.paymentIntents.create({
      amount: BUDGET_YEN,
      currency: CURRENCY,
      payment_method: 'pm_card_visa', // Stripe が用意している test payment method (成功する)
      confirm: true,
      transfer_group: `match_${match.id}`,
      metadata: { paymentId: payment.id, matchId: match.id },
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    })
    ctx.paymentIntentId = pi.id
    ok(`PaymentIntent 作成 + confirm: ${pi.id} status=${pi.status}`)

    if (pi.status !== 'succeeded') {
      fail(`PaymentIntent が succeeded にならず (status=${pi.status})`)
    }
    const chargeId =
      typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id ?? null
    if (!chargeId) fail('latest_charge が取得できない')
    ctx.chargeId = chargeId!
    ok(`Charge 生成: ${chargeId}`)

    // -------- 5. Payment を HELD にする（本番では webhook がやる）--------
    step(5, 'Payment を HELD に更新（webhook 相当）')
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'HELD',
        stripePaymentIntentId: pi.id,
        stripeChargeId: chargeId!,
        paidAt: new Date(),
      },
    })
    const held = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })
    if (held.status !== 'HELD') fail(`Payment status が HELD にならず: ${held.status}`)
    ok(`Payment status = HELD, chargeId 保存済み`)

    // -------- 6. Match を COMPLETED に（発注者が検収完了）--------
    step(6, 'Match を COMPLETED に更新（検収完了）')
    await prisma.match.update({
      where: { id: match.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    })
    ok('Match status = COMPLETED')

    // -------- 7. releasePayment を実行 --------
    step(7, 'releasePayment(paymentId) を実行')
    // path alias は tsx で解決できないので相対 import
    const { releasePayment } = await import('../src/lib/payment-release')
    const result = await releasePayment(payment.id)
    if (!result.ok) {
      fail(`releasePayment 失敗: reason=${result.reason} detail=${result.detail ?? ''}`)
    }
    ctx.transferId = result.transferId
    ok(`Transfer 作成: ${result.transferId}`)

    // -------- 8. verify: Payment.status === RELEASED --------
    step(8, 'DB verify: Payment.status = RELEASED + stripeTransferId 保存')
    const released = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })
    if (released.status !== 'RELEASED') fail(`Payment status が RELEASED にならず: ${released.status}`)
    if (released.stripeTransferId !== result.transferId) {
      fail(`stripeTransferId 不一致: DB=${released.stripeTransferId} vs API=${result.transferId}`)
    }
    if (!released.releasedAt) fail('releasedAt が保存されていない')
    ok(`Payment status=RELEASED, transferId=${released.stripeTransferId}, releasedAt=${released.releasedAt.toISOString()}`)

    // -------- 9. verify: Stripe API 側の Transfer 実体 --------
    step(9, 'Stripe API verify: Transfer amount / destination / source_transaction')
    const transfer = await stripe.transfers.retrieve(result.transferId)
    if (transfer.amount !== EXPECTED_PAYOUT) {
      fail(`Transfer amount 不一致: expected=${EXPECTED_PAYOUT}, actual=${transfer.amount}`)
    }
    if (transfer.destination !== artistConnect.id) {
      fail(`Transfer destination 不一致: expected=${artistConnect.id}, actual=${transfer.destination}`)
    }
    if (transfer.source_transaction !== chargeId) {
      fail(`Transfer source_transaction 不一致: expected=${chargeId}, actual=${transfer.source_transaction}`)
    }
    if (transfer.currency !== CURRENCY) {
      fail(`Transfer currency 不一致: expected=${CURRENCY}, actual=${transfer.currency}`)
    }
    ok(`Transfer amount=¥${transfer.amount.toLocaleString()} / destination=${transfer.destination} / source=${transfer.source_transaction}`)

    // -------- 10. verify: 冪等性（同じ releasePayment を再度呼んでも二重送金しない）--------
    step(10, '冪等性 verify: releasePayment を再度呼んでも Transfer 増えない')
    const retry = await releasePayment(payment.id)
    if (retry.ok) fail(`重複 release が成功してしまった (transferId=${retry.transferId})`)
    if (retry.reason !== 'not_held') {
      fail(`期待するエラー理由 not_held と異なる: ${retry.reason}`)
    }
    ok(`2 回目の release は not_held で正しく拒否された`)

    // -------- 完了 --------
    console.log(`\n${c.green(c.bold('✓ E2E テスト完了'))}`)
    console.log(`  Buyer 支払い: ¥${BUDGET_YEN.toLocaleString()}`)
    console.log(`  Platform 手数料: ¥${EXPECTED_FEE.toLocaleString()} (${(EXPECTED_FEE / BUDGET_YEN) * 100}%)`)
    console.log(`  Artist 受取: ¥${EXPECTED_PAYOUT.toLocaleString()}`)
    console.log(`  Stripe Dashboard: https://dashboard.stripe.com/test/payments/${pi.id}`)
    console.log(`  Transfer:         https://dashboard.stripe.com/test/connect/transfers/${result.transferId}`)
  } catch (e) {
    console.error(`\n${c.red(c.bold('✗ E2E テスト失敗'))}`)
    console.error(e)
    process.exitCode = 1
  } finally {
    await cleanup(ctx)
  }
}

main()
