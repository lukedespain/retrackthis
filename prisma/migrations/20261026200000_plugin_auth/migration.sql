CREATE TABLE "PluginDeviceAuth" (
    "id" TEXT NOT NULL,
    "deviceCodeHash" TEXT NOT NULL,
    "userCode" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "userId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastPolledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PluginDeviceAuth_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PluginDeviceAuth_deviceCodeHash_key" ON "PluginDeviceAuth"("deviceCodeHash");
CREATE UNIQUE INDEX "PluginDeviceAuth_userCode_key" ON "PluginDeviceAuth"("userCode");
CREATE INDEX "PluginDeviceAuth_expiresAt_idx" ON "PluginDeviceAuth"("expiresAt");
ALTER TABLE "PluginDeviceAuth" ADD CONSTRAINT "PluginDeviceAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PluginToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PluginToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PluginToken_tokenHash_key" ON "PluginToken"("tokenHash");
CREATE INDEX "PluginToken_userId_idx" ON "PluginToken"("userId");
ALTER TABLE "PluginToken" ADD CONSTRAINT "PluginToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
