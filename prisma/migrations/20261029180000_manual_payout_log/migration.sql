ALTER TABLE "Payment" ADD COLUMN "manualPayoutCents" INTEGER;
ALTER TABLE "Payment" ADD COLUMN "manualPayoutRef" TEXT;
ALTER TABLE "Payment" ADD COLUMN "manualPayoutAt" TIMESTAMP(3);
