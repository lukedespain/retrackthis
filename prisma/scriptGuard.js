/**
 * Refuse to run destructive seed/cleanup scripts against production
 * unless ALLOW_PROD_SCRIPTS=1 is explicitly set.
 */
function hostnameFromDatabaseUrl(url) {
  try {
    const u = new URL(url);
    return (u.hostname || "").toLowerCase();
  } catch {
    return "";
  }
}

function assertSafeDatabaseTarget(scriptName) {
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl) {
    throw new Error(`[${scriptName}] DATABASE_URL is not set`);
  }
  const host = hostnameFromDatabaseUrl(dbUrl);
  const looksProd =
    host.includes("supabase.com") ||
    host.includes("pooler.supabase") ||
    host.includes("amazonaws.com");
  const allow = process.env.ALLOW_PROD_SCRIPTS === "1";
  if (looksProd && !allow) {
    throw new Error(
      `[${scriptName}] Refusing to run against database host "${host}". ` +
        `Point DATABASE_URL at a local/dev database, or set ALLOW_PROD_SCRIPTS=1 if you really mean it.`
    );
  }
  console.log(`[${scriptName}] database host: ${host || "(unknown)"}`);
}

module.exports = { assertSafeDatabaseTarget, hostnameFromDatabaseUrl };
