// Sign-in for the Retrack This Bridge DAW plugin ("enter the code" / device flow).
//
// 1. Plugin: POST /api/plugin/auth/start -> a secret deviceCode + a short userCode to show.
// 2. User: approves the userCode on /connect while signed in to the website.
// 3. Plugin: polls POST /api/plugin/auth/token with the deviceCode; once approved it gets
//    a plugin token exactly once ("rtb_..."), sent later as "Authorization: Bearer rtb_...".
//
// Only SHA-256 hashes of the deviceCode and token are stored. Tokens expire after 90
// days unused and can be revoked in Settings. Routes accept a plugin token only when
// they call getRequestUserId(req, { allowPlugin: true }); everything else stays
// website-session only.
import { createHash, randomBytes, randomInt } from "crypto";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/supabaseServer";

export const DEVICE_CODE_TTL_MS = 10 * 60 * 1000;
export const POLL_INTERVAL_S = 5;
export const TOKEN_IDLE_MS = 90 * 24 * 60 * 60 * 1000;
const LAST_USED_WRITE_MS = 60 * 60 * 1000; // refresh lastUsedAt at most hourly
const TOKEN_PREFIX = "rtb_";
// No look-alikes (0/O, 1/I/L, 5/S, 2/Z, 8/B).
const CODE_ALPHABET = "ACDEFGHJKMNPQRTUVWXY34679";

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export function newDeviceCode() {
  return randomBytes(32).toString("base64url");
}

/** "RTKX-7Q2M": 8 characters from an unambiguous alphabet. */
export function newUserCode() {
  let raw = "";
  for (let i = 0; i < 8; i++) raw += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

/** Accepts what people type: lowercase, spaces, missing dash. */
export function normalizeUserCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (raw.length !== 8 || [...raw].some((c) => !CODE_ALPHABET.includes(c))) return null;
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

export function newPluginToken() {
  return TOKEN_PREFIX + randomBytes(32).toString("base64url");
}

/** Short, plain app label shown on /connect and in Connected apps. */
export function cleanClientName(input: unknown): string {
  const name = typeof input === "string" ? input.replace(/[^\p{L}\p{N} ()·.,'-]/gu, "").trim() : "";
  return (name || "Retrack This Bridge").slice(0, 60);
}

/**
 * For a job posted by the plugin: the DAW it came from ("Logic Pro"), shown as
 * "Sent from Logic Pro". Null for website requests, so it can't be set from the site.
 */
export function pluginPostedFrom(req: NextRequest, host: unknown): string | null {
  if (!hasPluginToken(req)) return null;
  const name = typeof host === "string" ? host.replace(/[^\p{L}\p{N} .&+'-]/gu, "").trim().slice(0, 40) : "";
  return name || "Retrack This Bridge";
}

/** True when the request carries a plugin token (valid or not). */
export function hasPluginToken(req: NextRequest): boolean {
  return bearer(req) !== null;
}

function bearer(req: NextRequest): string | null {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return match && match[1].startsWith(TOKEN_PREFIX) ? match[1] : null;
}

/** The user behind a plugin token, or null if it's missing, revoked or idle too long. */
export async function getPluginUserId(req: NextRequest): Promise<string | null> {
  const token = bearer(req);
  if (!token) return null;
  const row = await db.pluginToken.findUnique({
    where: { tokenHash: sha256(token) },
    select: { id: true, userId: true, lastUsedAt: true, revokedAt: true },
  });
  if (!row || row.revokedAt) return null;
  const idle = Date.now() - row.lastUsedAt.getTime();
  if (idle > TOKEN_IDLE_MS) return null;
  if (idle > LAST_USED_WRITE_MS) {
    await db.pluginToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  }
  return row.userId;
}

/**
 * The signed-in user for a route: the website session, or (only when the route
 * opts in) a plugin token. Never trust a user id from the request body.
 */
export async function getRequestUserId(req: NextRequest, opts: { allowPlugin?: boolean } = {}) {
  if (opts.allowPlugin && bearer(req)) return getPluginUserId(req);
  return getSessionUserId();
}
