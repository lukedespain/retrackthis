-- Lock down Supabase Data API (PostgREST).
-- The Next.js app uses Prisma via DATABASE_URL (bypasses RLS as postgres/pooler).
-- anon/authenticated must not read or write app tables directly.
-- Enabling RLS with no policies = deny all for those roles.
-- Also revoke table grants from anon/authenticated (defense in depth).

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Job" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Take" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TakeFile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "User" FROM anon, authenticated;
REVOKE ALL ON TABLE "Job" FROM anon, authenticated;
REVOKE ALL ON TABLE "Take" FROM anon, authenticated;
REVOKE ALL ON TABLE "TakeFile" FROM anon, authenticated;
REVOKE ALL ON TABLE "Payment" FROM anon, authenticated;
REVOKE ALL ON TABLE "_prisma_migrations" FROM anon, authenticated;
