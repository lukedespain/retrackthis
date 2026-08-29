-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Bootstrap admin account
UPDATE "User" SET "isAdmin" = true WHERE lower(email) = 'music@lukedespain.com';
