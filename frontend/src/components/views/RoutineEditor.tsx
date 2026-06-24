/**
 * Refactorizado por OpenCode (deepseek-v4-pro) 2026-06-24.
 * Fix de reactividad de tema en MusclePicker aplicado por Claude Code (claude-sonnet-4-6) 2026-06-24.
 */
import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import Body from 'react-muscle-highlighter'
import type { Slug, ExtendedBodyPart } from 'react-muscle-highlighter'
import { useNavigate, useParams } from 'react-router-dom'
import { routinesApi } from '../../api/routines'
import { aiApi } from '../../api/ai'
import { useAuthStore, useUIStore } from '../../store'
import type { Routine, DayDef, ExerciseDef } from '../../types/domain'
import {
  IconTrash, IconArrowUp, IconArrowDown, IconPlus,
  IconCheck, IconAI, IconDumbbell, IconClose, IconEye,
  IconBolt, IconAlertTriangle
} from '../ui/Icons'

const EMPTY_EX: ExerciseDef = { name: '', reps: '10-12', rest: 90, sets: 3 }

const EXERCISE_CATALOG: Record<string, { name: string; reps: string; sets: number; rest: number }[]> = {
  pecho: [
    { name: 'Press de banca plana con barra', reps: '6-8', sets: 4, rest: 120 },
    { name: 'Press inclinado con mancuernas', reps: '10-12', sets: 3, rest: 90 },
    { name: 'Press declinado con barra', reps: '8-10', sets: 3, rest: 90 },
    { name: 'Aperturas en máquina (Pec Deck)', reps: '12-15', sets: 3, rest: 60 },
    { name: 'Cruces en polea alta', reps: '12-15', sets: 3, rest: 60 },
    { name: 'Fondos en paralelas (pecho)', reps: '8-12', sets: 3, rest: 90 },
    { name: 'Pullover con mancuerna', reps: '12-15', sets: 3, rest: 60 },
    { name: 'Press con mancuernas neutro', reps: '10-12', sets: 3, rest: 90 },
  ],
  espalda: [
    { name: 'Dominadas (agarre prono)', reps: '6-10', sets: 4, rest: 120 },
    { name: 'Jalón al pecho en polea', reps: '10-12', sets: 4, rest: 90 },
    { name: 'Remo con barra inclinada', reps: '8-10', sets: 4, rest: 120 },
    { name: 'Remo con mancuerna a un brazo', reps: '10-12', sets: 3, rest: 90 },
    { name: 'Remo en polea baja (Gironda)', reps: '10-12', sets: 3, rest: 90 },
    { name: 'Peso muerto convencional', reps: '5-6', sets: 4, rest: 180 },
    { name: 'Jalón con brazos estirados en polea', reps: '12-15', sets: 3, rest: 60 },
    { name: 'Pulldown en cable (supino)', reps: '10-12', sets: 3, rest: 60 },
  ],
  hombros: [
    { name: 'Press militar con barra', reps: '6-8', sets: 4, rest: 120 },
    { name: 'Press Arnold con mancuernas', reps: '10-12', sets: 3, rest: 90 },
    { name: 'Elevaciones laterales con mancuernas', reps: '12-15', sets: 4, rest: 60 },
    { name: 'Elevaciones frontales alternadas', reps: '12-15', sets: 3, rest: 60 },
    { name: 'Pájaros en máquina (Delta posterior)', reps: '12-15', sets: 3, rest: 60 },
    { name: 'Face Pull en polea alta', reps: '15-20', sets: 3, rest: 60 },
    { name: 'Encogimientos de hombros con barra', reps: '12-15', sets: 3, rest: 60 },
    { name: 'Press con mancuernas sentado', reps: '10-12', sets: 3, rest: 90 },
  ],
  brazos: [
    { name: 'Curl de bíceps con barra EZ', reps: '10-12', sets: 3, rest: 90 },
    { name: 'Curl martillo con mancuernas', reps: '10-12', sets: 3, rest: 90 },
    { name: 'Curl predicador con barra EZ', reps: '10-12', sets: 3, rest: 90 },
    { name: 'Curl concentrado con mancuerna', reps: '12-15', sets: 3, rest: 60 },
    { name: 'Extensión de tríceps en polea', reps: '12-15', sets: 4, rest: 60 },
    { name: 'Press francés con barra EZ', reps: '10-12', sets: 3, rest: 90 },
    { name: 'Dips (fondos para tríceps)', reps: '8-12', sets: 3, rest: 90 },
    { name: 'Extensión de tríceps por encima de la cabeza', reps: '12-15', sets: 3, rest: 60 },
  ],
  piernas: [
    { name: 'Sentadilla trasera con barra', reps: '6-8', sets: 4, rest: 180 },
    { name: 'Prensa de piernas (Leg Press)', reps: '10-12', sets: 4, rest: 120 },
    { name: 'Peso muerto rumano con mancuernas', reps: '8-10', sets: 3, rest: 120 },
    { name: 'Peso muerto sumo con barra', reps: '8-10', sets: 3, rest: 120 },
    { name: 'Zancadas con mancuernas', reps: '10-12 c/l', sets: 3, rest: 90 },
    { name: 'Hip Thrust con barra', reps: '10-12', sets: 4, rest: 90 },
    { name: 'Extensión de cuádriceps en máquina', reps: '12-15', sets: 3, rest: 60 },
    { name: 'Curl femoral acostado', reps: '12-15', sets: 3, rest: 60 },
    { name: 'Elevación de talones (Calf Raises)', reps: '15-20', sets: 4, rest: 45 },
  ],
  core: [
    { name: 'Crunch abdominal en polea alta', reps: '15-20', sets: 3, rest: 60 },
    { name: 'Elevación de piernas colgado', reps: '12-15', sets: 3, rest: 60 },
    { name: 'Plancha abdominal isométrica', reps: '45-60s', sets: 3, rest: 60 },
    { name: 'Giro ruso con mancuerna', reps: '20', sets: 3, rest: 60 },
    { name: 'Bicicleta abdominal', reps: '20-30', sets: 3, rest: 45 },
    { name: 'Ab Wheel (rueda abdominal)', reps: '10-15', sets: 3, rest: 60 },
    { name: 'Sit-up declinado', reps: '15-20', sets: 3, rest: 60 },
  ]
}

const MUSCLE_LABELS: Record<string, string> = {
  pecho: 'Pecho',
  espalda: 'Espalda',
  hombros: 'Hombros',
  brazos: 'Bíceps y Tríceps',
  piernas: 'Piernas y Glúteos',
  core: 'Core / Abdomen',
}

const SLUG_TO_CATALOG: Partial<Record<Slug, string>> = {
  chest: 'pecho',
  deltoids: 'hombros',
  biceps: 'brazos',
  triceps: 'brazos',
  forearm: 'brazos',
  'upper-back': 'espalda',
  'lower-back': 'espalda',
  trapezius: 'espalda',
  abs: 'core',
  obliques: 'core',
  quadriceps: 'piernas',
  hamstring: 'piernas',
  gluteal: 'piernas',
  calves: 'piernas',
  adductors: 'piernas',
  tibialis: 'piernas',
}

const CATALOG_TO_SLUGS: Record<string, Slug[]> = {
  pecho: ['chest'],
  hombros: ['deltoids'],
  brazos: ['biceps', 'triceps', 'forearm'],
  espalda: ['upper-back', 'lower-back', 'trapezius'],
  core: ['abs', 'obliques'],
  piernas: ['quadriceps', 'hamstring', 'gluteal', 'calves', 'adductors', 'tibialis'],
}

const DISABLED_SLUGS: Slug[] = ['head', 'hair', 'neck', 'feet', 'hands', 'ankles', 'knees']

function MusclePicker({ selectedMuscle, onSelectMuscle }: { selectedMuscle: string; onSelectMuscle: (m: string) => void }) {
  // Suscribirse al tema/acento para que los colores del muñeco se actualicen en vivo
  const theme = useUIStore(s => s.theme)
  const accentTheme = useUIStore(s => s.accentTheme)
  const { primary, surface2, border } = useMemo(() => {
    const style = getComputedStyle(document.documentElement)
    return {
      primary:  style.getPropertyValue('--color-primary').trim(),
      surface2: style.getPropertyValue('--color-surface-2').trim(),
      border:   style.getPropertyValue('--color-border').trim(),
    }
  }, [theme, accentTheme])

  const activeSlugs = CATALOG_TO_SLUGS[selectedMuscle] ?? []
  const data: ExtendedBodyPart[] = activeSlugs.map(slug => ({
    slug,
    color: primary,
    styles: { stroke: primary, strokeWidth: 1.5 },
  }))

  function handlePress(part: ExtendedBodyPart) {
    if (!part.slug) return
    const catalog = SLUG_TO_CATALOG[part.slug]
    if (catalog) onSelectMuscle(catalog)
  }

  const commonProps = {
    data,
    onBodyPartPress: handlePress,
    defaultFill: surface2,
    defaultStroke: border,
    defaultStrokeWidth: 0.8,
    border: 'none' as const,
    disabledParts: DISABLED_SLUGS,
  }

  return (
    <div className="muscle-picker-wrap">
      <div className="muscle-picker-side">
        <div className="muscle-picker-label">FRONTAL</div>
        <Body {...commonProps} side="front" scale={0.65} />
      </div>
      <div className="muscle-picker-side">
        <div className="muscle-picker-label">DORSAL</div>
        <Body {...commonProps} side="back" scale={0.65} />
      </div>
    </div>
  )
}

export default function RoutineEditor() {
  const navigate = useNavigate()
  const { routineId } = useParams<{ routineId?: string }>()
  const { user } = useAuthStore()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [days, setDays] = useState<Record<string, DayDef>>({})
  const [saving, setSaving] = useState(false)

  // Day editor side panel state
  const [editingDayId, setEditingDayId] = useState<string | null>(null)
  const [dayEditorTab, setDayEditorTab] = useState<'exercises' | 'catalog'>('exercises')

  // Muscle catalog state
  const [selectedMuscle, setSelectedMuscle] = useState('pecho')

  // AI generator side panel state
  const [aiOpen, setAiOpen] = useState(false)
  const [aiObjective, setAiObjective] = useState('hipertrofia')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiError, setAiError] = useState('')

  const hasAI = !!(user?.settings?.aiProvider && user?.settings?.aiKeySet)

  // Close editor if editing day gets deleted
  useEffect(() => {
    if (editingDayId && !days[editingDayId]) {
      setEditingDayId(null)
    }
  }, [days, editingDayId])

  // Load existing routine for editing
  useEffect(() => {
    if (!routineId) return
    routinesApi.list().then(list => {
      const r = list.find((x: Routine) => x.id === routineId)
      if (!r) return
      setName(r.name)
      setDescription(r.description ?? '')
      setDays(r.days ?? {})
    }).catch(() => {})
  }, [routineId])

  const dayIds = Object.keys(days)
  const editingDay = editingDayId ? days[editingDayId] : null

  function addDay() {
    const newId = `dia${Object.keys(days).length + 1}`
    setDays(d => ({ ...d, [newId]: { id: newId, label: `Día ${Object.keys(days).length + 1}`, subtitle: '', exercises: [{ ...EMPTY_EX }] } }))
    setEditingDayId(newId)
    setDayEditorTab('exercises')
  }

  function removeDay(dayId: string) {
    if (!confirm('¿Eliminar este día por completo?')) return
    setDays(d => { const n = { ...d }; delete n[dayId]; return n })
  }

  function updateDayField(dayId: string, field: keyof DayDef, value: string) {
    setDays(d => ({ ...d, [dayId]: { ...d[dayId], [field]: value } }))
  }

  function addExercise(dayId: string) {
    setDays(d => ({ ...d, [dayId]: { ...d[dayId], exercises: [...d[dayId].exercises, { ...EMPTY_EX }] } }))
  }

  function updateExercise(dayId: string, idx: number, field: keyof ExerciseDef, value: string | number) {
    setDays(d => {
      const exs = d[dayId].exercises.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex)
      return { ...d, [dayId]: { ...d[dayId], exercises: exs } }
    })
  }

  function removeExercise(dayId: string, idx: number) {
    setDays(d => ({ ...d, [dayId]: { ...d[dayId], exercises: d[dayId].exercises.filter((_, i) => i !== idx) } }))
  }

  function moveExercise(dayId: string, idx: number, direction: 'up' | 'down') {
    setDays(d => {
      const exs = [...d[dayId].exercises]
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= exs.length) return d
      const temp = exs[idx]
      exs[idx] = exs[targetIdx]
      exs[targetIdx] = temp
      return { ...d, [dayId]: { ...d[dayId], exercises: exs } }
    })
  }

  function injectFromCatalog(ex: { name: string; reps: string; sets: number; rest: number }) {
    if (!editingDayId) return
    setDays(d => {
      const day = d[editingDayId]
      if (!day) return d
      const exs = [...day.exercises]
      if (exs.length === 1 && !exs[0].name.trim()) {
        exs[0] = { ...ex }
      } else {
        exs.push({ ...ex })
      }
      const subtitle = day.subtitle.trim() ? day.subtitle : (MUSCLE_LABELS[selectedMuscle] ?? '')
      return { ...d, [editingDayId]: { ...day, subtitle, exercises: exs } }
    })
  }

  async function generateWithAI() {
    if (aiGenerating) return
    setAiError('')
    setAiGenerating(true)

    const promptObj = aiPrompt.trim()
      ? `Requerimiento especial: ${aiPrompt}`
      : `Objetivo principal: ${aiObjective}.`

    const fullPrompt = `Crea un plan de rutina de gimnasio altamente efectivo. ${promptObj}
Devuelve el plan usando estrictamente esta estructura de texto plano (sin usar bloques json complejos, solo guiones):

DÍA 1: Torso (o nombre del día)
- Press de banca plana | 10-12 | 4 | 120
- Remo con barra | 10-12 | 4 | 120

DÍA 2: Piernas
- Sentadilla trasera | 8-10 | 4 | 180
- Peso muerto rumano | 10-12 | 3 | 120

Asegúrate de separar el nombre del ejercicio, reps, series y descanso en segundos usando el carácter "|". Genera 2 o 3 días optimizados.`

    try {
      const response = await aiApi.sendMessage(fullPrompt)
      const content = response.content

      const lines = content.split('\n').map((l: string) => l.trim()).filter(Boolean)
      const newDays: Record<string, DayDef> = {}
      let currentDayId = ''
      let dayCounter = 1

      for (const line of lines) {
        if (line.toUpperCase().includes('DÍA ') || line.toUpperCase().includes('DIA ') || line.startsWith('#')) {
          const cleanLabel = line.replace(/^[#*-]\s*/, '').replace(/^DÍA\s*\d+:\s*/i, '').replace(/^DIA\s*\d+:\s*/i, '')
          currentDayId = `dia${dayCounter++}`
          newDays[currentDayId] = {
            id: currentDayId,
            label: `Día ${dayCounter - 1}`,
            subtitle: cleanLabel || 'Entrenamiento general',
            exercises: []
          }
        } else if (line.startsWith('-') || line.includes('|')) {
          if (!currentDayId && dayCounter === 1) {
            currentDayId = 'dia1'
            newDays[currentDayId] = { id: currentDayId, label: 'Día 1', subtitle: 'Plan sugerido', exercises: [] }
            dayCounter++
          }
          if (currentDayId) {
            const parts = line.replace(/^[*-]\s*/, '').split('|').map((p: string) => p.trim())
            const exName = parts[0] || 'Ejercicio sugerido'
            const exReps = parts[1] || '10-12'
            const exSets = parseInt(parts[2] || '3', 10) || 3
            const exRest = parseInt(parts[3] || '90', 10) || 90
            newDays[currentDayId].exercises.push({ name: exName, reps: exReps, sets: exSets, rest: exRest })
          }
        }
      }

      if (Object.keys(newDays).length === 0) {
        newDays['dia1'] = {
          id: 'dia1',
          label: 'Día 1',
          subtitle: 'Plan IA (' + aiObjective.toUpperCase() + ')',
          exercises: [
            { name: 'Press de banca / Sentadilla', reps: '10-12', sets: 4, rest: 120 },
            { name: 'Remo / Jalón en polea', reps: '10-12', sets: 3, rest: 90 },
            { name: 'Ejercicio auxiliar aislado', reps: '12-15', sets: 3, rest: 60 }
          ]
        }
      }

      for (const k of Object.keys(newDays)) {
        if (newDays[k].exercises.length === 0) {
          newDays[k].exercises.push({ ...EMPTY_EX })
        }
      }

      setDays(newDays)
      if (!name) {
        setName(`Rutina IA: ${aiObjective.toUpperCase()}`)
      }
      setAiOpen(false)
    } catch {
      setAiError('Error al contactar la IA. Asegúrate de tener tu API Key configurada.')
    } finally {
      setAiGenerating(false)
    }
  }

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const data = { name: name.trim(), description: description.trim() || undefined, days }
      if (routineId) {
        await routinesApi.update(routineId, data)
      } else {
        await routinesApi.create(data)
      }
      navigate('/rutinas')
    } finally {
      setSaving(false)
    }
  }

  const suggestedExercises = EXERCISE_CATALOG[selectedMuscle] || []

  return (
    <div className="fade-in">
      {/* ── METADATA ─────────────────────────────────── */}
      <section className="card">
        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="field">
            <label>Nombre del plan</label>
            <input
              placeholder="Ej. Mi rutina de fuerza — Torso / Pierna"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus={!routineId}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Descripción (opcional)</label>
            <textarea
              style={{ minHeight: '64px', resize: 'vertical' }}
              placeholder="Notas generales: intensidad, objetivo, progresión…"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* ── DAY SUMMARY CARDS ────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
        {dayIds.length === 0 && (
          <div className="empty-state" style={{ padding: 'var(--space-6) 0' }}>
            <p style={{ marginBottom: 'var(--space-3)' }}>Sin días configurados. Añade días o genera una rutina con IA.</p>
          </div>
        )}

        {Object.entries(days).map(([dayId, day]) => {
          const previewNames = day.exercises
            .filter(ex => ex.name.trim())
            .map(ex => ex.name)
            .slice(0, 3)
          const hasMore = day.exercises.filter(ex => ex.name.trim()).length > 3

          return (
            <div key={dayId} className="day-summary-card" onClick={() => { setEditingDayId(dayId); setDayEditorTab('exercises') }}>
              <div className="day-summary-card-left">
                <span className="day-id-badge">{dayId.toUpperCase()}</span>
                <div className="day-summary-info">
                  <div className="day-summary-label">{day.label || dayId}</div>
                  {day.subtitle && <div className="day-summary-subtitle">{day.subtitle}</div>}
                  {previewNames.length > 0 && (
                    <div className="day-summary-preview">
                      {previewNames.join(' · ')}{hasMore ? '…' : ''}
                    </div>
                  )}
                </div>
              </div>
              <div className="day-summary-card-right">
                <span className="day-summary-count">{day.exercises.length} ejerc.</span>
                <button
                  className="icon-btn-danger"
                  style={{ width: 32, height: 32 }}
                  onClick={e => { e.stopPropagation(); removeDay(dayId) }}
                  title="Eliminar día"
                  aria-label="Eliminar día"
                >
                  <IconTrash size={15} />
                </button>
              </div>
            </div>
          )
        })}

        <button className="ghost-btn" style={{ width: '100%', padding: 'var(--space-4)', justifyContent: 'center', gap: 'var(--space-2)' }} onClick={addDay}>
          <IconPlus size={16} /> Añadir día de entrenamiento
        </button>
      </div>

      {/* ── QUICK ACTIONS ────────────────────────────── */}
      <div className="quick-actions-row">
        <button className="ghost-btn" onClick={() => setAiOpen(true)}>
          <IconAI size={18} /> Generar con IA
        </button>
      </div>

      {/* ── STICKY SAVE BAR ──────────────────────────── */}
      <div className="editor-sticky-bar">
        <button className="ghost-btn" onClick={() => navigate('/rutinas')}>Cancelar</button>
        <button className="primary-btn" onClick={save} disabled={saving || !name.trim()}>
          {saving ? 'Guardando…' : <><IconCheck size={18} /> Guardar</>}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════
          DAY EDITOR SIDE PANEL
          ══════════════════════════════════════════════════════ */}
      {editingDay && editingDayId && createPortal(
        <div className="side-panel-overlay open" onClick={e => { if (e.target === e.currentTarget) setEditingDayId(null) }}>
          <div className="side-panel">
            <div className="side-panel-drag-handle" />

            <div className="side-panel-header">
              <div className="side-panel-title-area">
                <h3>{editingDay.label || editingDayId}</h3>
                <p>{editingDay.subtitle || `${editingDay.exercises.length} ejercicios`}</p>
              </div>
              <button className="side-panel-close-btn" onClick={() => setEditingDayId(null)} aria-label="Cerrar editor">
                <IconClose size={18} />
                <span>Cerrar</span>
              </button>
            </div>

            <div className="editor-tab-bar">
              <button
                className={`editor-tab-btn ${dayEditorTab === 'exercises' ? 'active' : ''}`}
                onClick={() => setDayEditorTab('exercises')}
              >
                <IconDumbbell size={16} /> Ejercicios
              </button>
              <button
                className={`editor-tab-btn ${dayEditorTab === 'catalog' ? 'active' : ''}`}
                onClick={() => setDayEditorTab('catalog')}
              >
                <IconEye size={16} /> Buscar ejercicios
              </button>
            </div>

            <div className="side-panel-body">
              {dayEditorTab === 'exercises' ? (
                <>
                  {/* Col headers — solo desktop */}
                  {editingDay.exercises.length > 0 && (
                    <div className="exercise-col-header">
                      <span>Ejercicio</span>
                      <div className="exercise-col-header-stats">
                        <span>Reps</span><span>Series</span><span>Desc. (s)</span>
                      </div>
                      <span />
                    </div>
                  )}
                  <div className="exercise-editor-list">
                    {editingDay.exercises.map((ex, idx) => (
                      <div key={idx} className="exercise-editor-row">
                        <div className="ex-main-info">
                          <input
                            placeholder="Nombre del ejercicio…"
                            value={ex.name}
                            onChange={e => updateExercise(editingDayId, idx, 'name', e.target.value)}
                          />
                        </div>
                        <div className="ex-stats-info">
                          <input placeholder="10-12" value={ex.reps} onChange={e => updateExercise(editingDayId, idx, 'reps', e.target.value)} />
                          <input type="number" placeholder="3" value={ex.sets} onChange={e => updateExercise(editingDayId, idx, 'sets', Number(e.target.value))} />
                          <input type="number" placeholder="90" value={ex.rest} onChange={e => updateExercise(editingDayId, idx, 'rest', Number(e.target.value))} />
                        </div>
                        <div className="ex-actions">
                          <button className="icon-btn-subtle ex-move-btn" disabled={idx === 0} onClick={() => moveExercise(editingDayId, idx, 'up')}><IconArrowUp size={14} /></button>
                          <button className="icon-btn-subtle ex-move-btn" disabled={idx === editingDay.exercises.length - 1} onClick={() => moveExercise(editingDayId, idx, 'down')}><IconArrowDown size={14} /></button>
                          <button className="icon-btn-subtle danger" onClick={() => removeExercise(editingDayId, idx)}><IconTrash size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="ghost-btn" style={{ width: '100%', marginTop: 'var(--space-3)', justifyContent: 'center' }} onClick={() => addExercise(editingDayId)}>
                    <IconPlus size={14} /> Añadir ejercicio
                  </button>
                </>
              ) : (
                <>
                  {/* Muscle picker SVG */}
                  <div style={{ padding: 'var(--space-3)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)' }}>
                    <MusclePicker selectedMuscle={selectedMuscle} onSelectMuscle={setSelectedMuscle} />
                  </div>

                  {/* Muscle chips */}
                  <div className="muscle-chips">
                    {Object.entries(MUSCLE_LABELS).map(([id, label]) => (
                      <button
                        key={id}
                        className={`muscle-chip${selectedMuscle === id ? ' active' : ''}`}
                        onClick={() => setSelectedMuscle(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Suggested exercises */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '.05em', textTransform: 'uppercase' }}>
                        {MUSCLE_LABELS[selectedMuscle]} — {suggestedExercises.length} ejercicios
                      </span>
                    </div>

                    <div className="suggested-ex-grid">
                      {suggestedExercises.map((ex, i) => (
                        <div key={i} className="suggested-ex-item">
                          <div>
                            <div className="suggested-ex-name">{ex.name}</div>
                            <div className="suggested-ex-detail">{ex.sets} series · {ex.reps} reps · {ex.rest}s desc.</div>
                          </div>
                          <button className="ghost-btn" style={{ padding: '5px 10px', fontSize: 'var(--text-xs)', flexShrink: 0 }} onClick={() => injectFromCatalog(ex)}>
                            <IconPlus size={12} /> Añadir
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Field edits for day label/subtitle inside the panel */}
            <div style={{ padding: 'var(--space-4) var(--space-5)', borderTop: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', background: 'var(--color-surface-2)' }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 'var(--text-xs)' }}>Etiqueta del día</label>
                <input
                  placeholder="Ej. Torso A"
                  value={editingDay.label}
                  onChange={e => updateDayField(editingDayId, 'label', e.target.value)}
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 'var(--text-xs)' }}>Subtítulo</label>
                <input
                  placeholder="Ej. Pecho y tríceps"
                  value={editingDay.subtitle}
                  onChange={e => updateDayField(editingDayId, 'subtitle', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ══════════════════════════════════════════════════════
          AI GENERATOR SIDE PANEL
          ══════════════════════════════════════════════════════ */}
      {aiOpen && createPortal(
        <div className="side-panel-overlay open" onClick={e => { if (e.target === e.currentTarget) setAiOpen(false) }}>
          <div className="side-panel">
            <div className="side-panel-drag-handle" />

            <div className="side-panel-header">
              <div className="side-panel-title-area" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div className="icon-btn-accent" style={{ pointerEvents: 'none', flexShrink: 0, width: 36, height: 36 }}>
                  <IconAI size={18} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3>Generar rutina con IA</h3>
                  <p>Crea días y ejercicios según tu objetivo</p>
                </div>
              </div>
              <button className="side-panel-close-btn" onClick={() => setAiOpen(false)} aria-label="Cerrar">
                <IconClose size={18} />
                <span>Cerrar</span>
              </button>
            </div>

            <div className="side-panel-body">
              {!hasAI ? (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-8) 0' }}>
                  <IconAlertTriangle size={14} strokeWidth={2} />
                  Configura un proveedor y clave de IA en <strong>Configuración → IA</strong> para habilitar el generador automático.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <div className="field">
                    <label>Objetivo de entrenamiento</label>
                    <select value={aiObjective} onChange={e => setAiObjective(e.target.value)} disabled={aiGenerating}>
                      <option value="hipertrofia">Hipertrofia (Ganancia muscular)</option>
                      <option value="fuerza">Fuerza Pura</option>
                      <option value="definicion">Definición / Pérdida de grasa</option>
                      <option value="principiante">Acondicionamiento Principiante</option>
                    </select>
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Instrucciones adicionales (opcional)</label>
                    <input
                      placeholder="Ej. Enfocado en brazos, entrenar 3 días a la semana"
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      disabled={aiGenerating}
                    />
                  </div>
                  {aiError && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)' }}>{aiError}</div>}
                </div>
              )}
            </div>

            {hasAI && (
              <div className="side-panel-footer">
                <button className="primary-btn" style={{ flex: 1, padding: '1rem' }} onClick={generateWithAI} disabled={aiGenerating}>
                  {aiGenerating ? 'Estructurando rutina…' : <><IconBolt size={14} strokeWidth={2} /> Generar rutina completa</>}
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
