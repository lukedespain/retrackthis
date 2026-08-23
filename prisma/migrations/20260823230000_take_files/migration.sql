-- CreateEnum
CREATE TYPE "TakeFileKind" AS ENUM ('AUDIO', 'MIDI');

-- CreateTable
CREATE TABLE "TakeFile" (
    "id" TEXT NOT NULL,
    "takeId" TEXT NOT NULL,
    "kind" "TakeFileKind" NOT NULL,
    "label" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TakeFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TakeFile_takeId_idx" ON "TakeFile"("takeId");

-- CreateIndex
CREATE UNIQUE INDEX "Take_jobId_musicianId_key" ON "Take"("jobId", "musicianId");

-- AddForeignKey
ALTER TABLE "TakeFile" ADD CONSTRAINT "TakeFile_takeId_fkey" FOREIGN KEY ("takeId") REFERENCES "Take"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing single-file takes
INSERT INTO "TakeFile" ("id", "takeId", "kind", "label", "fileUrl", "sortOrder")
SELECT
    'legacy_' || "id",
    "id",
    'AUDIO'::"TakeFileKind",
    'Take 1',
    "audioFileUrl",
    0
FROM "Take";
