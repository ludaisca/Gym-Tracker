-- CreateIndex
CREATE INDEX "NutritionDay_meals_idx" ON "NutritionDay" USING GIN ("meals" jsonb_path_ops);

-- CreateIndex
CREATE INDEX "WorkoutSession_exercises_idx" ON "WorkoutSession" USING GIN ("exercises" jsonb_path_ops);
