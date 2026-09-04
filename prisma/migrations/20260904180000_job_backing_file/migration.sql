-- Full-song / dual reference tracks for job posts
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "backingFileUrl" TEXT;
