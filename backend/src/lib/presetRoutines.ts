export interface ExerciseDef { name: string; reps: string; rest: number; sets: number }
export interface DayDef { id: string; label: string; subtitle: string; exercises: ExerciseDef[] }
export interface PresetRoutine { id: string; name: string; days: Record<string, DayDef> }

export const PRESET_ROUTINES: Record<string, PresetRoutine> = {
  'torso-pierna': {
    id: 'torso-pierna', name: 'Torso / Pierna · 4 días',
    days: {
      lunes:   { id: 'lunes',   label: 'Torso A',  subtitle: 'Empuje',  exercises: [
        { name: 'Press de banca con barra',        reps: '6-8',   rest: 90,  sets: 4 },
        { name: 'Press inclinado con mancuernas',  reps: '10-12', rest: 90,  sets: 3 },
        { name: 'Press militar con mancuernas',    reps: '10-12', rest: 90,  sets: 3 },
        { name: 'Elevaciones laterales',           reps: '12-15', rest: 60,  sets: 3 },
        { name: 'Extensión de tríceps en polea',   reps: '12-15', rest: 60,  sets: 3 },
      ]},
      martes:  { id: 'martes',  label: 'Pierna A', subtitle: 'Cuádriceps', exercises: [
        { name: 'Sentadilla con barra',      reps: '6-8',   rest: 120, sets: 4 },
        { name: 'Prensa de pierna',          reps: '10-12', rest: 90,  sets: 3 },
        { name: 'Extensión de cuádriceps',   reps: '12-15', rest: 60,  sets: 3 },
        { name: 'Curl femoral acostado',     reps: '12-15', rest: 60,  sets: 3 },
        { name: 'Elevación de gemelos',      reps: '15-20', rest: 60,  sets: 4 },
        { name: 'Plancha abdominal',         reps: '20-30s',rest: 60,  sets: 3 },
      ]},
      jueves:  { id: 'jueves',  label: 'Torso B',  subtitle: 'Tirón', exercises: [
        { name: 'Remo con barra o máquina',  reps: '6-8',   rest: 90,  sets: 4 },
        { name: 'Jalón al pecho',            reps: '10-12', rest: 90,  sets: 3 },
        { name: 'Remo en polea baja',        reps: '10-12', rest: 90,  sets: 3 },
        { name: 'Face pulls',                reps: '15',    rest: 60,  sets: 3 },
        { name: 'Curl de bíceps',            reps: '12-15', rest: 60,  sets: 3 },
      ]},
      viernes: { id: 'viernes', label: 'Pierna B', subtitle: 'Cadena posterior', exercises: [
        { name: 'Peso muerto rumano',           reps: '6-8',       rest: 120, sets: 4 },
        { name: 'Hip thrust con barra',         reps: '10-12',     rest: 90,  sets: 3 },
        { name: 'Curl femoral sentado',         reps: '12-15',     rest: 60,  sets: 3 },
        { name: 'Sentadilla búlgara',           reps: '10-12 c/p', rest: 90,  sets: 3 },
        { name: 'Abducción en máquina',         reps: '15',        rest: 60,  sets: 3 },
        { name: 'Elevación de piernas / rueda', reps: '10-15',     rest: 60,  sets: 3 },
      ]},
    },
  },
  'ppl': {
    id: 'ppl', name: 'Push / Pull / Legs · 3 días',
    days: {
      lunes: { id: 'lunes', label: 'Push', subtitle: 'Pecho, hombros, tríceps', exercises: [
        { name: 'Press de banca con barra',              reps: '4-6',   rest: 120, sets: 4 },
        { name: 'Press inclinado con mancuernas',        reps: '8-12',  rest: 90,  sets: 4 },
        { name: 'Press militar con barra (de pie)',      reps: '6-8',   rest: 90,  sets: 3 },
        { name: 'Cruces en polea alta (pecho inferior)', reps: '12-15', rest: 60,  sets: 3 },
        { name: 'Elevaciones laterales con mancuernas', reps: '12-15', rest: 60,  sets: 4 },
        { name: 'Extensión de tríceps en polea alta',   reps: '12-15', rest: 60,  sets: 3 },
        { name: 'Press francés con barra EZ',           reps: '10-12', rest: 60,  sets: 3 },
      ]},
      miercoles: { id: 'miercoles', label: 'Pull', subtitle: 'Espalda, bíceps', exercises: [
        { name: 'Dominadas lastradas o jalón al pecho', reps: '6-10',  rest: 90,  sets: 4 },
        { name: 'Remo con barra (estilo Pendlay)',       reps: '6-8',   rest: 90,  sets: 4 },
        { name: 'Pullover con mancuerna',               reps: '10-12', rest: 60,  sets: 3 },
        { name: 'Remo en polea baja agarre neutro',     reps: '10-12', rest: 60,  sets: 3 },
        { name: 'Face pulls con cuerda',                reps: '15-20', rest: 60,  sets: 4 },
        { name: 'Curl con barra EZ (supinado)',         reps: '10-12', rest: 60,  sets: 3 },
        { name: 'Curl martillo con mancuernas',         reps: '12-15', rest: 60,  sets: 3 },
      ]},
      viernes: { id: 'viernes', label: 'Legs', subtitle: 'Cuádriceps, isquios, glúteos', exercises: [
        { name: 'Sentadilla con barra (barra alta)',  reps: '5-8',       rest: 120, sets: 4 },
        { name: 'Prensa de pierna 45°',              reps: '10-12',     rest: 90,  sets: 3 },
        { name: 'Peso muerto rumano con barra',      reps: '8-10',      rest: 90,  sets: 4 },
        { name: 'Sentadilla búlgara con mancuernas', reps: '10-12 c/p', rest: 90,  sets: 3 },
        { name: 'Curl femoral acostado en máquina',  reps: '12-15',     rest: 60,  sets: 3 },
        { name: 'Elevación de gemelos de pie',       reps: '15-20',     rest: 60,  sets: 4 },
        { name: 'Plancha con rotación de cadera',    reps: '30-40s',    rest: 60,  sets: 3 },
      ]},
    },
  },
  'full-body': {
    id: 'full-body', name: 'Full Body · 3 días (Fuerza)',
    days: {
      lunes: { id: 'lunes', label: 'Full Body A', subtitle: 'Fuerza base', exercises: [
        { name: 'Sentadilla con barra',        reps: '5',     rest: 150, sets: 5 },
        { name: 'Press de banca con barra',    reps: '5',     rest: 120, sets: 5 },
        { name: 'Peso muerto convencional',    reps: '5',     rest: 180, sets: 1 },
        { name: 'Remo con barra (asistencia)', reps: '8-10',  rest: 60,  sets: 3 },
        { name: 'Fondos en paralelas',         reps: '8-12',  rest: 60,  sets: 3 },
        { name: 'Curl con barra',              reps: '10-12', rest: 60,  sets: 3 },
      ]},
      miercoles: { id: 'miercoles', label: 'Full Body B', subtitle: 'Press + remo', exercises: [
        { name: 'Sentadilla con barra',                 reps: '5',     rest: 150, sets: 5 },
        { name: 'Press militar con barra (de pie)',     reps: '5',     rest: 120, sets: 5 },
        { name: 'Remo con barra al pecho (Pendlay)',    reps: '5',     rest: 120, sets: 5 },
        { name: 'Jalón al pecho agarre estrecho',       reps: '8-12',  rest: 60,  sets: 3 },
        { name: 'Extensión de tríceps en polea',        reps: '12-15', rest: 60,  sets: 3 },
        { name: 'Elevación de gemelos en prensa',       reps: '15-20', rest: 60,  sets: 3 },
      ]},
      viernes: { id: 'viernes', label: 'Full Body C', subtitle: 'Variantes progresivas', exercises: [
        { name: 'Sentadilla con barra (añadir 2.5kg)',     reps: '5',    rest: 150, sets: 5 },
        { name: 'Press de banca con barra',                reps: '5',    rest: 120, sets: 5 },
        { name: 'Peso muerto convencional (añadir 5kg)',   reps: '5',    rest: 180, sets: 1 },
        { name: 'Dominadas lastradas o con peso corporal', reps: '5-8',  rest: 90,  sets: 3 },
        { name: 'Extensión de tríceps con mancuerna',      reps: '10-12',rest: 60,  sets: 3 },
        { name: 'Curl con mancuernas (alternado)',          reps: '10-12',rest: 60,  sets: 3 },
      ]},
    },
  },
}

export function getRoutineDays(activeRoutineId: string | null | undefined, customRoutines: Array<{ id: string; days: unknown }>): Record<string, DayDef> {
  if (!activeRoutineId) return {}
  if (PRESET_ROUTINES[activeRoutineId]) return PRESET_ROUTINES[activeRoutineId].days
  const custom = customRoutines.find(r => r.id === activeRoutineId)
  return (custom?.days ?? {}) as Record<string, DayDef>
}
