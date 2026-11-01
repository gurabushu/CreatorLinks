-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationKind" ADD VALUE 'FOLLOW_EVENT_CREATED';
ALTER TYPE "NotificationKind" ADD VALUE 'FOLLOW_PROJECT_CREATED';
ALTER TYPE "NotificationKind" ADD VALUE 'FOLLOW_PORTFOLIO_ADDED';
ALTER TYPE "NotificationKind" ADD VALUE 'EVENT_UPDATED';
ALTER TYPE "NotificationKind" ADD VALUE 'EVENT_CANCELLED';
ALTER TYPE "NotificationKind" ADD VALUE 'PROJECT_UPDATED';
ALTER TYPE "NotificationKind" ADD VALUE 'ANNOUNCEMENT';
