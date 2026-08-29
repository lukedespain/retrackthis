-- AlterTable
ALTER TABLE "User" ADD COLUMN "instruments" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Job" ADD COLUMN "instrumentId" TEXT;
