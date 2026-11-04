-- CreateTable
CREATE TABLE "early_bird_reservations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primaryInstrument" TEXT,
    "reservedSlot" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "claimedUserId" TEXT,

    CONSTRAINT "early_bird_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "early_bird_reservations_email_key" ON "early_bird_reservations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "early_bird_reservations_reservedSlot_key" ON "early_bird_reservations"("reservedSlot");

-- CreateIndex
CREATE INDEX "early_bird_reservations_claimedAt_idx" ON "early_bird_reservations"("claimedAt");
