-- 2026-11-02 fee-only pivot v2: PRO サブスク系残滓とプロモコード機構を削除
-- - User.hasPaidSubscription / User.hasLifetimeFreePro フィールド削除
-- - PromoCode / PromoRedemption テーブル削除

-- DropTable (relation 依存のため先に Redemption)
DROP TABLE IF EXISTS "promo_redemptions";
DROP TABLE IF EXISTS "promo_codes";

-- AlterTable
ALTER TABLE "users" DROP COLUMN IF EXISTS "hasPaidSubscription";
ALTER TABLE "users" DROP COLUMN IF EXISTS "hasLifetimeFreePro";
