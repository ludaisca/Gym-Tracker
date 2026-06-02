import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { routinesApi } from '../../api/routines'
import { aiApi } from '../../api/ai'
import { useAuthStore } from '../../store'
import type { Routine, DayDef, ExerciseDef } from '../../types/domain'
import { 
  IconTrash, IconPlus, 
  IconCheck, IconAI, IconDumbbell, IconClose
} from '../ui/Icons'
import { Reorder, AnimatePresence, motion } from 'framer-motion'
import { hapticImpact } from '../../lib/haptics'

const EMPTY_EX: ExerciseDef = { name: '', reps: '10-12', rest: 90, sets: 3 }

const EXERCISE_CATALOG: Record<string, { name: string; reps: string; sets: number; rest: number }[]> = {
  pecho: [
    { name: 'Press de banca plana con barra', reps: '8-10', sets: 4, rest: 120 },
    { name: 'Press inclinado con mancuernas', reps: '10-12', sets: 3, rest: 90 },
    { name: 'Aperturas en máquina (Pec Deck)', reps: '12-15', sets: 3, rest: 60 },
    { name: 'Cruces en polea alta', reps: '12-15', sets: 3, rest: 60 },
  ],
  espalda: [
    { name: 'Dominadas (o Jalón al pecho)', reps: '8-10', sets: 4, rest: 120 },
    { name: 'Remo con barra inclinada', reps: '8-10', sets: 4, rest: 120 },
    { name: 'Remo en polea baja (Gironda)', reps: '10-12', sets: 3, rest: 90 },
    { name: 'Jalón con brazos estirados en polea', reps: '12-15', sets: 3, rest: 60 },
  ],
  hombros: [
    { name: 'Press militar con mancuernas', reps: '8-10', sets: 4, rest: 120 },
    { name: 'Elevaciones laterales con mancuernas', reps: '12-15', sets: 4, rest: 60 },
    { name: 'Pájaros en máquina (Delt posterior)', reps: '12-15', sets: 3, rest: 60 },
    { name: 'Face Pull en polea alta', reps: '12-15', sets: 3, rest: 60 },
  ],
  brazos: [
    { name: 'Curl de bíceps con barra EZ', reps: '10-12', sets: 3, rest: 90 },
    { name: 'Curl martillo con mancuernas', reps: '10-12', sets: 3, rest: 90 },
    { name: 'Extensión de tríceps en polea', reps: '10-12', sets: 4, rest: 60 },
    { name: 'Press francés con barra EZ', reps: '10-12', sets: 3, rest: 90 },
  ],
  piernas: [
    { name: 'Sentadilla trasera con barra', reps: '6-8', sets: 4, rest: 180 },
    { name: 'Prensa de piernas (Leg Press)', reps: '10-12', sets: 4, rest: 120 },
    { name: 'Peso muerto rumano con mancuernas', reps: '8-10', sets: 3, rest: 120 },
    { name: 'Extensión de cuádriceps en máquina', reps: '12-15', sets: 3, rest: 60 },
    { name: 'Curl femoral acostado/sentado', reps: '12-15', sets: 3, rest: 60 },
  ],
  core: [
    { name: 'Crunch abdominal en polea alta', reps: '15-20', sets: 3, rest: 60 },
    { name: 'Elevación de piernas colgado', reps: '12-15', sets: 3, rest: 60 },
    { name: 'Plancha abdominal isométrica', reps: '60s', sets: 3, rest: 60 },
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

function AnatomicalMap({ selectedMuscle, onSelectMuscle }: { selectedMuscle: string; onSelectMuscle: (m: string) => void }) {
  function getStyle(m: string) {
    const active = selectedMuscle === m
    return {
      fill: active ? 'var(--color-primary)' : 'var(--color-surface-offset)',
      stroke: active ? 'var(--color-accent)' : 'var(--color-border)',
      strokeWidth: active ? 2 : 1.5,
      cursor: 'pointer',
      transition: 'all 0.25s ease',
      opacity: active ? 0.9 : 0.7
    }
  }

  return (
    <div className="map-container" style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'space-around', flexWrap: 'wrap' }}>
      {/* VISTA FRONTAL */}
      <div className="map-view-box" style={{ textAlign: 'center', flex: '1 1 120px', minWidth: '120px' }}>
        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
          VISTA FRONTAL
        </div>
        <svg viewBox="0 0 100 220" style={{ width: '100%', maxHeight: '200px', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))' }}>
          {/* Cabeza */}
          <path d="M43 20 C43 8, 57 8, 57 20 C57 30, 53 32, 50 34 C47 32, 43 30, 43 20 Z" fill="var(--color-surface-offset)" stroke="var(--color-border)" strokeWidth="1.5" />
          {/* Cuello/Trapecios base */}
          <path d="M47 34 L53 34 L62 38 L38 38 Z" fill="var(--color-surface-offset)" stroke="var(--color-border)" strokeWidth="1.5" />
          
          {/* Pecho */}
          <path 
            d="M38 40 Q50 48 62 40 L64 60 Q50 66 36 60 Z" 
            style={getStyle('pecho')} 
            onClick={() => onSelectMuscle('pecho')}
            aria-label="Pecho"
          />
          
          {/* Hombros frontal */}
          <path d="M36 40 L26 52 L30 75 L38 65 L38 40 Z" style={getStyle('hombros')} onClick={() => onSelectMuscle('hombros')} aria-label="Hombros" />
          <path d="M64 40 L74 52 L70 75 L62 65 L64 40 Z" style={getStyle('hombros')} onClick={() => onSelectMuscle('hombros')} aria-label="Hombros" />
          
          {/* Brazos frontal */}
          <path d="M30 75 L20 105 L25 135 L32 135 L36 100 L38 65 Z" style={getStyle('brazos')} onClick={() => onSelectMuscle('brazos')} aria-label="Brazos" />
          <path d="M70 75 L80 105 L75 135 L68 135 L64 100 L62 65 Z" style={getStyle('brazos')} onClick={() => onSelectMuscle('brazos')} aria-label="Brazos" />
          
          {/* Core / Abdomen */}
          <path d="M38 62 Q50 68 62 62 L58 115 L42 115 Z" style={getStyle('core')} onClick={() => onSelectMuscle('core')} aria-label="Core / Abdomen" />
          
          {/* Piernas frontal */}
          <path d="M41 117 L28 165 L33 210 L42 210 L48 165 L48 117 Z" style={getStyle('piernas')} onClick={() => onSelectMuscle('piernas')} aria-label="Piernas" />
          <path d="M59 117 L72 165 L67 210 L58 210 L52 165 L52 117 Z" style={getStyle('piernas')} onClick={() => onSelectMuscle('piernas')} aria-label="Piernas" />
        </svg>
      </div>

      {/* VISTA DORSAL */}
      <div className="map-view-box" style={{ textAlign: 'center', flex: '1 1 120px', minWidth: '120px' }}>
        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
          VISTA DORSAL
        </div>
        <svg viewBox="0 0 100 220" style={{ width: '100%', maxHeight: '200px', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))' }}>
          {/* Cabeza posterior */}
          <path d="M43 20 C43 8, 57 8, 57 20 C57 30, 53 32, 50 34 C47 32, 43 30, 43 20 Z" fill="var(--color-surface-offset)" stroke="var(--color-border)" strokeWidth="1.5" />
          
          {/* Espalda / Dorsales / Trapecios */}
          <path 
            d="M38 40 L62 40 L66 80 L58 115 L42 115 L34 80 Z" 
            style={getStyle('espalda')} 
            onClick={() => onSelectMuscle('espalda')}
            aria-label="Espalda"
          />
          
          {/* Hombros posterior */}
          <path d="M38 40 L26 52 L30 75 L34 60 Z" style={getStyle('hombros')} onClick={() => onSelectMuscle('hombros')} aria-label="Hombros" />
          <path d="M62 40 L74 52 L70 75 L66 60 Z" style={getStyle('hombros')} onClick={() => onSelectMuscle('hombros')} aria-label="Hombros" />
          
          {/* Brazos posterior */}
          <path d="M30 75 L20 105 L25 135 L32 135 L36 100 L34 80 Z" style={getStyle('brazos')} onClick={() => onSelectMuscle('brazos')} aria-label="Brazos" />
          <path d="M70 75 L80 105 L75 135 L68 135 L64 100 L66 80 Z" style={getStyle('brazos')} onClick={() => onSelectMuscle('brazos')} aria-label="Brazos" />
          
          {/* Piernas posterior */}
          <path d="M42 115 L28 165 L33 210 L42 210 L48 165 L48 115 Z" style={getStyle('piernas')} onClick={() => onSelectMuscle('piernas')} aria-label="Piernas y Glúteos" />
          <path d="M58 115 L72 165 L67 210 L58 210 L52 165 L52 115 Z" style={getStyle('piernas')} onClick={() => onSelectMuscle('piernas')} aria-label="Piernas y Glúteos" />
        </svg>
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
  
  // Estados para generador IA
  const [aiOpen, setAiOpen] = useState(false)
  const [aiObjective, setAiObjective] = useState('hipertrofia')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiError, setAiError] = useState('')
  const hasAI = !!(user?.settings?.aiProvider && user?.settings?.aiKeySet)

  // Estados para buscador anatómico
  const [selectedMuscle, setSelectedMuscle] = useState('pecho')
  const [selectedTargetDay, setSelectedTargetDay] = useState<string>('')
  const [isCatalogOpen, setIsCatalogOpen] = useState(false)

  useEffect(() => {
    if (!routineId) return
    routinesApi.list().then(list => {
      const r = list.find((x: Routine) => x.id === routineId)
      if (!r) return
      setName(r.name)
      setDescription(r.description ?? '')
      setDays(r.days ?? {})
    }).catch((err: unknown) => console.warn("[load]", err))
  }, [routineId])

  const dayIds = Object.keys(days)
  const currentTargetDay = selectedTargetDay && dayIds.includes(selectedTargetDay) 
    ? selectedTargetDay 
    : (dayIds[0] ?? '')

  function addDay() {
    const dayId = `dia${Object.keys(days).length + 1}`
    setDays(d => ({ ...d, [dayId]: { id: dayId, label: `Día ${Object.keys(days).length + 1}`, subtitle: '', exercises: [{ ...EMPTY_EX }] } }))
    return dayId
  }

  function handleAddDayClick() {
    hapticImpact('light')
    const newDayId = addDay()
    setSelectedTargetDay(newDayId)
  }

  function removeDay(dayId: string) {
    hapticImpact('medium')
    if (!confirm('¿Eliminar este día por completo?')) return
    setDays(d => { const n = { ...d }; delete n[dayId]; return n })
    if (selectedTargetDay === dayId) setSelectedTargetDay('')
  }

  function updateDayField(dayId: string, field: keyof DayDef, value: string) {
    setDays(d => ({ ...d, [dayId]: { ...d[dayId], [field]: value } }))
  }

  function addExercise(dayId: string) {
    hapticImpact('light')
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


  function updateExercisesOrder(dayId: string, newExercises: ExerciseDef[]) {
    setDays(d => ({ ...d, [dayId]: { ...d[dayId], exercises: newExercises } }))
  }

  function injectSuggestedExercise(ex: { name: string; reps: string; sets: number; rest: number }) {
    hapticImpact('light')
    let targetId = currentTargetDay
    if (!targetId) {
      targetId = addDay()
    }
    setDays(d => {
      const day = d[targetId]
      return {
        ...d,
        [targetId]: {
          ...day,
          exercises: [...day.exercises, { name: ex.name, sets: ex.sets, reps: ex.reps, rest: ex.rest }]
        }
      }
    })
    setIsCatalogOpen(false)
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
      
      // Parsear respuesta del texto plano
      const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
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
            const parts = line.replace(/^[*-]\s*/, '').split('|').map(p => p.trim())
            const exName = parts[0] || 'Ejercicio sugerido'
            const exReps = parts[1] || '10-12'
            const exSets = parseInt(parts[2] || '3', 10) || 3
            const exRest = parseInt(parts[3] || '90', 10) || 90
            newDays[currentDayId].exercises.push({ name: exName, reps: exReps, sets: exSets, rest: exRest })
          }
        }
      }

      // Si no se pudo parsear correctamente, proveemos una estructura base de respaldo
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

      // Asegurar que ningún día tenga arreglo de ejercicios vacío
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
    } catch (err) {
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


  return (
    <div className="fade-in">
      <div className="panel-head" style={{ padding: '0 0 var(--space-5)' }}>
        <div>
          <h3>{routineId ? 'Editar rutina' : 'Diseñador de Rutina'}</h3>
          <p>Crea tu plan con nuestro mapa anatómico o genera con IA.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="ghost-btn" onClick={() => navigate('/rutinas')}>Cancelar</button>
          <button className="primary-btn" onClick={save} disabled={saving || !name.trim()}>
            {saving ? 'Guardando…' : <><IconCheck size={18} /> Guardar</>}
          </button>
        </div>
      </div>

      {/* BANNER GENERADOR IA */}
      <section className="card-premium" style={{ overflow: 'hidden' }}>
        <div 
          style={{ 
            padding: 'var(--space-3) var(--space-5)', 
            background: 'linear-gradient(135deg, var(--color-surface-offset), var(--color-surface-2))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            borderBottom: aiOpen ? '1px solid var(--color-border)' : 'none'
          }}
          onClick={() => setAiOpen(!aiOpen)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ background: 'var(--color-accent)', color: '#000', padding: '6px', borderRadius: 'var(--radius-md)' }}>
              <IconAI size={20} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                Asistente Inteligente IA
              </h4>
              <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                Genera días y ejercicios automáticamente según tu objetivo
              </p>
            </div>
          </div>
          <button className="ghost-btn" style={{ fontSize: 'var(--text-xs)', padding: '4px 8px' }}>
            {aiOpen ? 'Ocultar panel' : 'Desplegar'}
          </button>
        </div>

        {aiOpen && (
          <div style={{ padding: 'var(--space-4) var(--space-5)', background: 'var(--color-surface)' }}>
            {!hasAI ? (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)', padding: 'var(--space-2) 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <span>Configura un proveedor y clave de IA en <strong>Configuración → IA</strong> para habilitar el generador automático.</span>
                </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                  <div className="field" style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ fontSize: 'var(--text-xs)' }}>Objetivo de Entrenamiento</label>
                    <select 
                      className="premium-input" 
                      value={aiObjective} 
                      onChange={e => setAiObjective(e.target.value)}
                      disabled={aiGenerating}
                    >
                      <option value="hipertrofia">Hipertrofia (Ganancia muscular)</option>
                      <option value="fuerza">Fuerza Pura</option>
                      <option value="definicion">Definición / Pérdida de grasa</option>
                      <option value="principiante">Acondicionamiento Principiante</option>
                    </select>
                  </div>
                  <div className="field" style={{ flex: 2, minWidth: '250px' }}>
                    <label style={{ fontSize: 'var(--text-xs)' }}>Instrucciones adicionales (Opcional)</label>
                    <input 
                      className="premium-input" 
                      placeholder="Ej. Enfocado en brazos, entrenar 3 días a la semana" 
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      disabled={aiGenerating}
                    />
                  </div>
                </div>

                {aiError && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)' }}>{aiError}</div>}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    className="primary-btn" 
                    style={{ fontSize: 'var(--text-xs)', padding: '8px 16px', background: 'var(--color-accent)', color: '#000' }}
                    onClick={generateWithAI}
                    disabled={aiGenerating}
                  >
                    {aiGenerating ? 'Estructurando rutina inteligente...' : 'Generar Rutina Completa'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* BOTTOM SHEET CATALOGO */}
      {createPortal(
        <AnimatePresence>
          {isCatalogOpen && (
            <motion.div 
              className="bottom-sheet-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => e.target === e.currentTarget && setIsCatalogOpen(false)}
            >
              <motion.div 
                className="bottom-sheet"
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.4}
                onDragEnd={(e, info) => { if (info.offset.y > 100) setIsCatalogOpen(false) }}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                <div className="drag-handle"><div className="bottom-sheet-drag" /></div>
                
                <div className="bottom-sheet-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                    <h3>Catálogo de Ejercicios</h3>
                    <button className="icon-btn-subtle" onClick={() => setIsCatalogOpen(false)}>
                      <IconClose size={20} />
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
                    <div style={{ padding: 'var(--space-2)', background: 'var(--color-surface-offset)', borderRadius: 'var(--radius-lg)' }}>
                      <AnatomicalMap selectedMuscle={selectedMuscle} onSelectMuscle={setSelectedMuscle} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                      <h4 style={{ color: 'var(--color-primary)' }}>{MUSCLE_LABELS[selectedMuscle]}</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {EXERCISE_CATALOG[selectedMuscle].map((ex, i) => (
                          <div key={i} className="exercise-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface)', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)' }}>
                            <div>
                              <div className="exercise-name" style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{ex.name}</div>
                              <div className="exercise-meta" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{ex.sets} sets × {ex.reps} | {ex.rest}s descanso</div>
                            </div>
                            <button 
                              className="icon-btn-subtle" 
                              style={{ color: 'var(--color-primary)', background: 'var(--color-primary-highlight)' }}
                              onClick={() => injectSuggestedExercise(ex)}
                            >
                              <IconPlus size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* METADATOS BÁSICOS */}
      <section className="card-premium">
        <div className="panel-body triple" style={{ padding: 'var(--space-4) var(--space-5)' }}>
          <div className="field" style={{ gridColumn: '1 / span 2', marginBottom: 0 }}>
            <label>Nombre del Plan</label>
            <input 
              className="premium-input"
              placeholder="Ej. Mi rutina de fuerza premium" 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1', marginBottom: 0, marginTop: 'var(--space-3)' }}>
            <label>Descripción (Opcional)</label>
            <textarea 
              className="premium-input"
              style={{ minHeight: '60px', padding: '8px 12px' }}
              placeholder="Notas generales de intensidad o progresión" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
            />
          </div>
        </div>
      </section>

      {/* PESTAÑAS (TABS) DE DÍAS */}
      {dayIds.length > 0 && (
        <div className="day-tabs-container" style={{ marginTop: 'var(--space-4)' }}>
          {dayIds.map(d => (
            <button
              key={d}
              className={`day-tab ${currentTargetDay === d ? 'active' : ''}`}
              onClick={() => { hapticImpact('light'); setSelectedTargetDay(d) }}
            >
              {(days[d] as any).label || d.toUpperCase()}
            </button>
          ))}
          <button className="day-tab-add" onClick={handleAddDayClick}>
            <IconPlus size={20} />
          </button>
        </div>
      )}

      {/* CONTENIDO DEL DÍA SELECCIONADO */}
      <AnimatePresence mode="wait">
        {currentTargetDay && days[currentTargetDay] ? (
          <motion.div
            key={currentTargetDay}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}
          >
            <section className="card-premium">
              <div className="panel-head" style={{ background: 'var(--color-surface-2)', padding: 'var(--space-3) var(--space-5)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-3)', flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div className="day-id-badge">{currentTargetDay.toUpperCase()}</div>
                  <div className="field" style={{ flex: 1, minWidth: 120, margin: 0 }}>
                    <input 
                      className="premium-input-ghost"
                      placeholder="Etiqueta (Ej. Torso A)" 
                      value={days[currentTargetDay].label} 
                      onChange={e => updateDayField(currentTargetDay, 'label', e.target.value)} 
                    />
                  </div>
                  <div className="field" style={{ flex: 2, minWidth: 180, margin: 0 }}>
                    <input 
                      className="premium-input-ghost tiny"
                      placeholder="Subtítulo (Ej. Pecho y tríceps)" 
                      value={days[currentTargetDay].subtitle} 
                      onChange={e => updateDayField(currentTargetDay, 'subtitle', e.target.value)} 
                    />
                  </div>
                </div>
                <button className="icon-btn-danger" style={{ width: '32px', height: '32px' }} onClick={() => removeDay(currentTargetDay)}>
                  <IconTrash size={16} />
                </button>
              </div>

              <div className="panel-body" style={{ padding: 'var(--space-3) var(--space-5)' }}>
                <Reorder.Group 
                  axis="y" 
                  values={days[currentTargetDay].exercises} 
                  onReorder={(newOrder) => updateExercisesOrder(currentTargetDay, newOrder)}
                  className="exercise-editor-list"
                  style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
                >
                  {days[currentTargetDay].exercises.map((ex, idx) => (
                    <Reorder.Item 
                      key={`${currentTargetDay}-ex-${idx}-${ex.name}`} 
                      value={ex}
                      className="exercise-editor-row"
                      style={{ cursor: 'grab', background: 'var(--color-surface)', position: 'relative' }}
                      onDragStart={() => hapticImpact('light')}
                      whileDrag={{ scale: 1.02, boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}
                    >
                      <div className="ex-main-info" style={{ flex: 1, display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                        <div style={{ opacity: 0.3, cursor: 'grab', padding: '0 var(--space-1)' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/></svg>
                        </div>
                        <div className="field" style={{ margin: 0, flex: 1 }}>
                          <label className="mobile-only-label" style={{ fontSize: '10px' }}>Ejercicio</label>
                          <input 
                            placeholder="Nombre del ejercicio…" 
                            value={ex.name} 
                            onChange={e => updateExercise(currentTargetDay, idx, 'name', e.target.value)} 
                          />
                        </div>
                      </div>
                      <div className="ex-stats-info" style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <div className="field" style={{ margin: 0, width: '60px' }}>
                          <label className="mobile-only-label" style={{ fontSize: '10px' }}>Reps</label>
                          <input placeholder="10-12" value={ex.reps} onChange={e => updateExercise(currentTargetDay, idx, 'reps', e.target.value)} style={{ textAlign: 'center' }} />
                        </div>
                        <div className="field" style={{ margin: 0, width: '50px' }}>
                          <label className="mobile-only-label" style={{ fontSize: '10px' }}>Series</label>
                          <input type="number" placeholder="3" value={ex.sets} onChange={e => updateExercise(currentTargetDay, idx, 'sets', Number(e.target.value))} style={{ textAlign: 'center' }} />
                        </div>
                        <div className="field" style={{ margin: 0, width: '60px' }}>
                          <label className="mobile-only-label" style={{ fontSize: '10px' }}>Desc. (s)</label>
                          <input type="number" placeholder="90" value={ex.rest} onChange={e => updateExercise(currentTargetDay, idx, 'rest', Number(e.target.value))} style={{ textAlign: 'center' }} />
                        </div>
                      </div>
                      <div className="ex-actions" style={{ marginLeft: 'auto' }}>
                        <button className="icon-btn-subtle danger" onClick={() => removeExercise(currentTargetDay, idx)}>
                          <IconTrash size={16} />
                        </button>
                      </div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
                
                <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                  <button className="add-ex-btn" style={{ flex: 1 }} onClick={() => addExercise(currentTargetDay)}>
                    <IconPlus size={16} /> Añadir en blanco
                  </button>
                  <button className="primary-btn" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => setIsCatalogOpen(true)}>
                    <IconDumbbell size={16} /> Catálogo
                  </button>
                </div>
              </div>
            </section>
          </motion.div>
        ) : (
          <div className="empty-state" style={{ marginTop: 'var(--space-6)' }}>
            <div className="empty-icon"><IconDumbbell size={48} /></div>
            <p>Agrega el primer día de tu rutina para empezar.</p>
            <button className="add-day-btn-premium" style={{ marginTop: 'var(--space-2)' }} onClick={handleAddDayClick}>
              <div className="add-icon"><IconPlus size={24} /></div>
              <span>Crear Día 1</span>
            </button>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
