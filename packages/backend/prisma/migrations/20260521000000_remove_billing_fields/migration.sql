-- Remove Stripe/billing fields from User table
ALTER TABLE "User" DROP COLUMN IF EXISTS "plan";
ALTER TABLE "User" DROP COLUMN IF EXISTS "planExpiresAt";
ALTER TABLE "User" DROP COLUMN IF EXISTS "trialEndsAt";
ALTER TABLE "User" DROP COLUMN IF EXISTS "stripeCustomerId";
