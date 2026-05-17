-- AlterTable: subscription fields on User
ALTER TABLE "User"
  ADD COLUMN "plan"             TEXT      NOT NULL DEFAULT 'free',
  ADD COLUMN "planExpiresAt"    TIMESTAMP(3),
  ADD COLUMN "trialEndsAt"      TIMESTAMP(3),
  ADD COLUMN "stripeCustomerId" TEXT;

-- CreateIndex: unique stripeCustomerId
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
