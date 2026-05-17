export interface SetData {
  kg: string
  reps: string
}

export interface ExerciseSession {
  name?: string
  done: boolean
  sets: SetData[]
}

export interface CardioData {
  machine: string
  duration: string
  intensity: string
}

export interface WorkoutSession {
  id: string
  userId: string
  routineId?: string | null
  weekNumber: number
  dayId: string
  complete: boolean
  notes?: string | null
  cardio?: CardioData | null
  exercises: ExerciseSession[]
  createdAt: string
  updatedAt: string
}

export interface ExerciseDef {
  name: string
  reps: string
  rest: number
  sets: number
}

export interface DayDef {
  id: string
  label: string
  subtitle: string
  exercises: ExerciseDef[]
}

export interface Routine {
  id: string
  userId: string
  name: string
  description?: string | null
  days: Record<string, DayDef>
}

export interface FoodEntry {
  id: string
  name: string
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export type MealType = 'desayuno' | 'almuerzo' | 'cena' | 'snack'

export interface NutritionDay {
  id: string
  userId: string
  date: string
  water: number
  meals: Record<MealType, FoodEntry[]>
}

export interface GlobalNote {
  id: string
  userId: string
  text: string
  done: boolean
  position: number
  createdAt: string
}

export interface SavedFood {
  id: string
  userId: string
  name: string
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface UserSettings {
  sessionLength: string
  goal: string
  cardioDefault: string
  calorieGoal: number
  proteinGoal: number
  carbGoal: number
  fatGoal: number
  waterGoal: number
  aiProvider?: string | null
  aiModel?: string | null
  aiKeySet?: boolean
}

export interface User {
  id: string
  email: string
  name: string
  avatar: string
  theme: string
  accentTheme?: string
  activeRoutineId?: string | null
  routineStartDate?: string | null
  currentWeek: number
  settings?: UserSettings | null
  plan: 'free' | 'pro'
  planExpiresAt?: string | null
  trialEndsAt?: string | null
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}
