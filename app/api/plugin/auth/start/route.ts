import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  DEVICE_CODE_TTL_MS,
  POLL_INTERVAL_S,
  cleanClientName,
  newDeviceCode,
  newUserCode,
  sha256,
} from "@/lib/pluginAuth";
import { appBaseUrl } from "@/lib/appUrl";

// POST /api/plugin/auth/start { clientName? } — plugin begins sign-in.
// Returns the secret deviceCode (plugin keeps it) and the userCode to show.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const clientName = cleanClientName(body?.clientName);
  const deviceCode = newDeviceCode();
  const expiresAt = new Date(Date.now() + DEVICE_CODE_TTL_MS);

  // Tidy up old requests now and then (cheap; keeps the table small).
  await db.pluginDeviceAuth.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });

  for (let attempt = 0; attempt < 5; attempt++) {
    const userCode = newUserCode();
    try {
      await db.pluginDeviceAuth.create({
        data: { deviceCodeHash: sha256(deviceCode), userCode, clientName, expiresAt },
      });
      const verificationUri = `${appBaseUrl()}/connect`;
      return NextResponse.json({
        deviceCode,
        userCode,
        verificationUri,
        verificationUriComplete: `${verificationUri}?code=${encodeURIComponent(userCode)}`,
        expiresIn: Math.round(DEVICE_CODE_TTL_MS / 1000),
        interval: POLL_INTERVAL_S,
      });
    } catch {
      // userCode collision (unique): try another.
    }
  }
  return NextResponse.json({ error: "Could not start sign-in. Try again." }, { status: 503 });
}
