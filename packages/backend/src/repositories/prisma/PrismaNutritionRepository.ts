import type { PrismaClient, NutritionDay, SavedFood } from '@prisma/client'
import type { NutritionRepository } from '../NutritionRepository'

export class PrismaNutritionRepository implements NutritionRepository {
  constructor(private prisma: PrismaClient) {}

  findByDate(userId: string, date: string): Promise<NutritionDay | null> {
    return this.prisma.nutritionDay.findUnique({ where: { userId_date: { userId, date } } })
  }

  findByDates(userId: string, dates: string[]): Promise<NutritionDay[]> {
    return this.prisma.nutritionDay.findMany({ where: { userId, date: { in: dates } } })
  }

  upsert(userId: string, date: string, data: { water?: number; meals?: object }): Promise<NutritionDay> {
    return this.prisma.nutritionDay.upsert({
      where: { userId_date: { userId, date } },
      update: data,
      create: { userId, date, ...data },
    })
  }

  async addMealEntry(
    userId: string,
    date: string,
    mealType: string,
    entry: { id: string; name: string; kcal: number; protein: number; carbs: number; fat: number }
  ): Promise<NutritionDay> {
    const day = await this.prisma.nutritionDay.findUnique({ where: { userId_date: { userId, date } } })
    const meals = (day?.meals as Record<string, unknown[]>) ?? {}
    const list = (meals[mealType] as unknown[]) ?? []
    list.push(entry)
    meals[mealType] = list
    return this.prisma.nutritionDay.upsert({
      where: { userId_date: { userId, date } },
      update: { meals: meals as object },
      create: { userId, date, meals: meals as object },
    })
  }

  async removeMealEntry(userId: string, date: string, mealType: string, foodId: string): Promise<void> {
    const day = await this.prisma.nutritionDay.findUnique({ where: { userId_date: { userId, date } } })
    if (!day) return
    const meals = (day.meals as Record<string, { id: string }[]>) ?? {}
    if (meals[mealType]) {
      meals[mealType] = meals[mealType].filter(e => e.id !== foodId)
      await this.prisma.nutritionDay.update({
        where: { userId_date: { userId, date } },
        data: { meals },
      })
    }
  }

  findSavedFoods(userId: string): Promise<SavedFood[]> {
    return this.prisma.savedFood.findMany({ where: { userId }, take: 200 })
  }

  createSavedFood(
    userId: string,
    data: { name: string; kcal: number; protein: number; carbs: number; fat: number }
  ): Promise<SavedFood> {
    return this.prisma.savedFood.create({ data: { userId, ...data } })
  }

  async deleteSavedFood(userId: string, id: string): Promise<void> {
    await this.prisma.savedFood.deleteMany({ where: { id, userId } })
  }
}
