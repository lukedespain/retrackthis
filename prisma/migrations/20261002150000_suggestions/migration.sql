-- Instrument suggestions, approved catalog extras, and feature requests.

CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

CREATE TABLE "InstrumentSuggestion" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "groupId" TEXT,
    "userId" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "instrumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstrumentSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApprovedInstrument" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "suggestionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovedInstrument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeatureRequest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InstrumentSuggestion_status_createdAt_idx" ON "InstrumentSuggestion"("status", "createdAt");
CREATE INDEX "InstrumentSuggestion_userId_idx" ON "InstrumentSuggestion"("userId");
CREATE UNIQUE INDEX "ApprovedInstrument_suggestionId_key" ON "ApprovedInstrument"("suggestionId");
CREATE INDEX "FeatureRequest_status_createdAt_idx" ON "FeatureRequest"("status", "createdAt");
CREATE INDEX "FeatureRequest_userId_idx" ON "FeatureRequest"("userId");

ALTER TABLE "InstrumentSuggestion" ADD CONSTRAINT "InstrumentSuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApprovedInstrument" ADD CONSTRAINT "ApprovedInstrument_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "InstrumentSuggestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FeatureRequest" ADD CONSTRAINT "FeatureRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InstrumentSuggestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApprovedInstrument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FeatureRequest" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "InstrumentSuggestion" FROM anon, authenticated;
REVOKE ALL ON TABLE "ApprovedInstrument" FROM anon, authenticated;
REVOKE ALL ON TABLE "FeatureRequest" FROM anon, authenticated;
