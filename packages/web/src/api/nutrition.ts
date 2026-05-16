import { api } from './client'
import type { NutritionDay, FoodEntry, MealType, SavedFood } from '../types/domain'

export const nutritionApi = {
  getDay: (date: string) =>
    api.get<NutritionDay>(`/nutrition/${date}`).then((r) => r.data),

  updateDay: (date: string, data: { water?: number; meals?: Partial<Record<MealType, FoodEntry[]>> }) =>
    api.put<NutritionDay>(`/nutrition/${date}`, data).then((r) => r.data),

  addFood: (date: string, mealType: MealType, food: Omit<FoodEntry, 'id'>) =>
    api.post<FoodEntry>(`/nutrition/${date}/meals/${mealType}`, food).then((r) => r.data),

  removeFood: (date: string, mealType: MealType, foodId: string) =>
    api.delete(`/nutrition/${date}/meals/${mealType}/${foodId}`),

  getSavedFoods: () => api.get<SavedFood[]>('/nutrition/saved-foods').then((r) => r.data),

  saveFood: (food: Omit<SavedFood, 'id' | 'userId'>) =>
    api.post<SavedFood>('/nutrition/saved-foods', food).then((r) => r.data),

  deleteSavedFood: (id: string) => api.delete(`/nutrition/saved-foods/${id}`),
}
