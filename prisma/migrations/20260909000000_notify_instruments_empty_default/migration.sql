-- Job alerts now match profile instruments only; stop defaulting alert filters to "all".
ALTER TABLE "User" ALTER COLUMN "notifyInstruments" SET DEFAULT ARRAY[]::TEXT[];
