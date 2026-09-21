-- Additive statuses so award and cancel can claim a job before talking to Stripe.
-- Postgres ADD VALUE is applied outside the migration transaction by Prisma.
ALTER TYPE "JobStatus" ADD VALUE 'AWARDING';
ALTER TYPE "JobStatus" ADD VALUE 'CANCELLING';

ALTER TABLE "Job" ADD COLUMN "moneyClaimedAt" TIMESTAMP(3);
