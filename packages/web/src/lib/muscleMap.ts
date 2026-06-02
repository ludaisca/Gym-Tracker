import type { WorkoutSession } from '../types/domain'

export const MUSCLE_MAP: Record<string, string[]> = {
  // Pecho
  'Press banca': ['pecho', 'hombros', 'triceps'],
  'Press banca inclinado': ['pecho', 'hombros', 'triceps'],
  'Press banca declinado': ['pecho', 'triceps'],
  'Aperturas': ['pecho'],
  'Aperturas en polea': ['pecho'],
  'Fondos': ['pecho', 'triceps', 'hombros'],
  'Flexiones': ['pecho', 'triceps', 'hombros'],
  'Press con mancuernas': ['pecho', 'hombros', 'triceps'],
  // Espalda
  'Jalón al pecho': ['espalda-alta', 'biceps'],
  'Jalón trasnuca': ['espalda-alta', 'biceps'],
  'Remo con barra': ['espalda-alta', 'espalda-baja', 'biceps'],
  'Remo con mancuerna': ['espalda-alta', 'biceps'],
  'Remo en polea': ['espalda-alta', 'biceps'],
  'Peso muerto': ['espalda-baja', 'isquios', 'gluteos'],
  'Dominadas': ['espalda-alta', 'biceps'],
  'Pullover': ['espalda-alta', 'pecho'],
  'Hiperextensiones': ['espalda-baja', 'gluteos'],
  // Hombros
  'Press militar': ['hombros', 'triceps'],
  'Press Arnold': ['hombros', 'triceps'],
  'Elevaciones laterales': ['hombros'],
  'Elevaciones frontales': ['hombros'],
  'Face pull': ['hombros', 'espalda-alta'],
  'Press hombros': ['hombros', 'triceps'],
  // Brazos
  'Curl bíceps': ['biceps'],
  'Curl martillo': ['biceps'],
  'Curl barra': ['biceps'],
  'Curl concentrado': ['biceps'],
  'Extensión tríceps': ['triceps'],
  'Press francés': ['triceps'],
  'Pushdown': ['triceps'],
  'Extensión tríceps sobre cabeza': ['triceps'],
  // Piernas
  'Sentadilla': ['cuadriceps', 'gluteos', 'isquios'],
  'Sentadilla goblet': ['cuadriceps', 'gluteos'],
  'Sentadilla búlgara': ['cuadriceps', 'gluteos'],
  'Prensa de pierna': ['cuadriceps', 'gluteos'],
  'Zancadas': ['cuadriceps', 'gluteos'],
  'Estocadas': ['cuadriceps', 'gluteos'],
  'Peso muerto rumano': ['isquios', 'gluteos', 'espalda-baja'],
  'Curl femoral': ['isquios'],
  'Extensión cuádriceps': ['cuadriceps'],
  'Elevación de gemelos': ['pantorrillas'],
  'Hip thrust': ['gluteos', 'isquios'],
  'Abductores': ['gluteos'],
  'Adductores': ['cuadriceps'],
  // Core
  'Abdominales': ['abdomen'],
  'Crunch': ['abdomen'],
  'Plancha': ['abdomen', 'espalda-baja'],
  'Russian twist': ['abdomen'],
  'Elevaciones de piernas': ['abdomen'],
  'Rollout': ['abdomen', 'espalda-baja'],
}

export const MUSCLE_NAMES: Record<string, string> = {
  pecho: 'Pecho',
  hombros: 'Hombros',
  triceps: 'Tríceps',
  biceps: 'Bíceps',
  'espalda-alta': 'Espalda alta',
  'espalda-baja': 'Espalda baja',
  cuadriceps: 'Cuádriceps',
  isquios: 'Isquios',
  gluteos: 'Glúteos',
  pantorrillas: 'Pantorrillas',
  abdomen: 'Abdomen',
}

export function getMuscleVolume(sessions: WorkoutSession[]): Record<string, number> {
  const volume: Record<string, number> = {}
  for (const session of sessions) {
    for (const ex of session.exercises) {
      if (!ex.done) continue
      const name = (ex.name ?? '').trim()
      let muscles = MUSCLE_MAP[name]
      if (!muscles) {
        const key = Object.keys(MUSCLE_MAP).find(
          k => name.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(name.toLowerCase())
        )
        if (key) muscles = MUSCLE_MAP[key]
      }
      if (!muscles) continue
      const sets = ex.sets.filter(s => parseFloat(s.kg) > 0 && parseFloat(s.reps) > 0).length
      if (sets === 0) continue
      for (const muscle of muscles) {
        volume[muscle] = (volume[muscle] ?? 0) + sets
      }
    }
  }
  return volume
}
