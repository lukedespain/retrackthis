-- Admin email blast history (compose / test / send-all from /admin?tab=emails)
CREATE TYPE "EmailBlastKind" AS ENUM ('TEST', 'BLAST');

CREATE TABLE "EmailBlast" (
    "id" TEXT NOT NULL,
    "kind" "EmailBlastKind" NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyPlain" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "ctaLabel" TEXT,
    "ctaHref" TEXT,
    "bottomImageUrl" TEXT,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "recipientEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "failuresJson" TEXT,
    "sentById" TEXT,
    "sentByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailBlast_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailBlast_kind_createdAt_idx" ON "EmailBlast"("kind", "createdAt");
CREATE INDEX "EmailBlast_createdAt_idx" ON "EmailBlast"("createdAt");
