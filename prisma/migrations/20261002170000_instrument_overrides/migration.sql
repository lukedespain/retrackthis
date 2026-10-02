-- Admin renames and hides for catalog instruments.

CREATE TABLE "InstrumentOverride" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstrumentOverride_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "InstrumentOverride" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "InstrumentOverride" FROM anon, authenticated;
