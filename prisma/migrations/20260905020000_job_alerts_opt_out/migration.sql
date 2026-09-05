-- Job alerts are opt-out: on by default for all instruments.
ALTER TABLE "User" ALTER COLUMN "notifyJobAlerts" SET DEFAULT true;
ALTER TABLE "User" ALTER COLUMN "notifyInstruments" SET DEFAULT ARRAY['all']::TEXT[];

-- Enable alerts for users who never opted in (still on the old empty defaults).
-- Leave alone anyone who already customized instruments or explicitly left alerts on.
UPDATE "User"
SET
  "notifyJobAlerts" = true,
  "notifyInstruments" = CASE
    WHEN cardinality("instruments") > 0 THEN "instruments"
    ELSE ARRAY['all']::TEXT[]
  END
WHERE "notifyJobAlerts" = false
  AND cardinality("notifyInstruments") = 0;
