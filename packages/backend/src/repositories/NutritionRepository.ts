import type { NutritionDay, SavedFood } from '@prisma/client'

export interface NutritionRepository {
  findByDate(userId: string, date: string): Promise<NutritionDay | null>
  findByDates(userId: string, dates: string[]): Promise<NutritionDay[]>

  upsert(
    userId: string,
    date: string,
    data: { water?: number; meals?: object }
  ): Promise<NutritionDay>

  // Meals (manipulate within the day JSON)
  addMealEntry(
    userId: string,
    date: string,
    mealType: string,
    entry: { id: string; name: string; kcal: number; protein: number; carbs: number; fat: number }
  ): Promise<NutritionDay>

  removeMealEntry(userId: string, date: string, mealType: string, foodId: string): Promise<void>

  // Saved foods
  findSavedFoods(userId: string): Promise<SavedFood[]>
  createSavedFood(userId: string, data: { name: string; kcal: number; protein: number; carbs: number; fat: number }): Promise<SavedFood>
  deleteSavedFood(userId: string, id: string): Promise<void>
}
