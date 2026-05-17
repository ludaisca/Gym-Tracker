-- AlterTable: Routine fields for share & marketplace
ALTER TABLE "Routine" ADD COLUMN "downloadCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "shareCode" TEXT;

-- CreateTable: SystemConfig (VAPID keys persistence)
CREATE TABLE "SystemConfig" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("key")
);

-- CreateTable: PushSubscription (F1 push notifications)
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");
CREATE INDEX "GlobalNote_userId_idx" ON "GlobalNote"("userId");
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE UNIQUE INDEX "Routine_shareCode_key" ON "Routine"("shareCode");
CREATE INDEX "Routine_userId_idx" ON "Routine"("userId");
CREATE INDEX "Routine_isPublic_idx" ON "Routine"("isPublic");
CREATE INDEX "SavedFood_userId_idx" ON "SavedFood"("userId");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
