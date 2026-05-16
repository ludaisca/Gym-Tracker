// Tipos compartidos para el dominio de la app
// Espejo de packages/web/src/types/domain.ts para uso en el backend

export interface ExerciseSet {
  kg: string
  reps: string
}

// Formato legacy almacenado en versiones anteriores
export interface ExerciseSetLegacy {
  weight?: number
  reps?: string | number
}

export interface ExerciseSession {
  name?: string
  done: boolean
  sets: (ExerciseSet | ExerciseSetLegacy)[]
}

export interface CardioData {
  machine: string
  duration: string
  intensity: string
}

export interface ExerciseDef {
  name: string
  reps: string
  rest: number
  sets: number
}

export interface RoutineDay {
  id: string
  label: string
  subtitle: string
  exercises: ExerciseDef[]
}

export type RoutineDays = Record<string, RoutineDay>

/** Calcula el 1RM estimado con la fórmula de Epley */
export function epleyOneRM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0
  return Math.round(weight * (1 + reps / 30))
}

/** Extrae los mejores 1RM por ejercicio de un array de sesiones */
export function extractBestOneRMs(
  sessions: Array<{ exercises: unknown }>
): Record<string, { name: string; weight: number; reps: number; oneRM: number }> {
  const bests: Record<string, { name: string; weight: number; reps: number; oneRM: number }> = {}

  for (const session of sessions) {
    let exercises: ExerciseSession[] = []
    if (typeof session.exercises === 'string') {
      try { exercises = JSON.parse(session.exercises) } catch { continue }
    } else if (Array.isArray(session.exercises)) {
      exercises = session.exercises as ExerciseSession[]
    }
    if (!Array.isArray(exercises)) continue

    for (const ex of exercises) {
      if (!ex?.name || !Array.isArray(ex.sets)) continue
      for (const set of ex.sets) {
        const legacy = set as ExerciseSetLegacy
        const w = parseFloat((set as ExerciseSet).kg ?? String(legacy.weight ?? 0))
        const r = parseFloat(String((set as ExerciseSet).reps ?? legacy.reps ?? 0))
        if (!(w > 0) || !(r > 0)) continue
        const oneRM = epleyOneRM(w, r)
        const key = ex.name.toLowerCase()
        if (!bests[key] || oneRM > bests[key].oneRM) {
          bests[key] = { name: ex.name, weight: w, reps: r, oneRM }
        }
      }
    }
  }

  return bests
}
