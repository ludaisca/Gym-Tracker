CREATE TABLE IF NOT EXISTS "LiftGoal" (
    "id"           TEXT NOT NULL,
    "userId"       TEXT NOT NULL,
    "exerciseName" TEXT NOT NULL,
    "targetKg"     DOUBLE PRECISION NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiftGoal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LiftGoal_userId_exerciseName_key" ON "LiftGoal"("userId", "exerciseName");
CREATE INDEX IF NOT EXISTS "LiftGoal_userId_idx" ON "LiftGoal"("userId");

ALTER TABLE "LiftGoal" ADD CONSTRAINT "LiftGoal_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
