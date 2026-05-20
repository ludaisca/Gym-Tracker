import { randomUUID } from 'crypto'
import type { NutritionDay, SavedFood } from '@prisma/client'
import type { NutritionRepository } from '../repositories/NutritionRepository'
import { ucErr, UCError } from './errors'

export async function getNutritionDay(
  nutrition: NutritionRepository,
  userId: string,
  date: string
): Promise<NutritionDay | { userId: string; date: string; water: number; meals: object }> {
  return (await nutrition.findByDate(userId, date)) ?? { userId, date, water: 0, meals: {} }
}

export async function getBatchNutrition(
  nutrition: NutritionRepository,
  userId: string,
  dates: string[]
): Promise<Array<NutritionDay | { userId: string; date: string; water: number; meals: object }>> {
  const rows = await nutrition.findByDates(userId, dates)
  const byDate = Object.fromEntries(rows.map(r => [r.date, r]))
  return dates.map(d => byDate[d] ?? { userId, date: d, water: 0, meals: {} })
}

export async function upsertNutritionDay(
  nutrition: NutritionRepository,
  userId: string,
  date: string,
  data: { water?: number; meals?: object }
): Promise<NutritionDay> {
  return nutrition.upsert(userId, date, data)
}

export async function addMealEntry(
  nutrition: NutritionRepository,
  userId: string,
  date: string,
  mealType: string,
  entry: { name: string; kcal: number; protein: number; carbs: number; fat: number }
): Promise<object> {
  const newEntry = { ...entry, id: randomUUID() }
  await nutrition.addMealEntry(userId, date, mealType, newEntry)
  return newEntry
}

export async function removeMealEntry(
  nutrition: NutritionRepository,
  userId: string,
  date: string,
  mealType: string,
  foodId: string
): Promise<void> {
  await nutrition.removeMealEntry(userId, date, mealType, foodId)
}

export async function listSavedFoods(
  nutrition: NutritionRepository,
  userId: string
): Promise<SavedFood[]> {
  return nutrition.findSavedFoods(userId)
}

export async function createSavedFood(
  nutrition: NutritionRepository,
  userId: string,
  data: { name: string; kcal: number; protein: number; carbs: number; fat: number }
): Promise<SavedFood> {
  return nutrition.createSavedFood(userId, data)
}

export async function deleteSavedFood(
  nutrition: NutritionRepository,
  userId: string,
  id: string
): Promise<void> {
  await nutrition.deleteSavedFood(userId, id)
}

export { UCError }
