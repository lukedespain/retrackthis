ALTER TABLE "User" ADD COLUMN "showInCommunity" BOOLEAN NOT NULL DEFAULT true;
-- Admin accounts start hidden from the homepage community; they can switch it on in Settings.
UPDATE "User" SET "showInCommunity" = false WHERE "isAdmin" = true;
