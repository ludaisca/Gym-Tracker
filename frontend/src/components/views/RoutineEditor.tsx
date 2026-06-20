import { useState, useEffect } from 'react'
import { IconBolt, IconAlertTriangle } from '../ui/Icons'
import { useNavigate, useParams } from 'react-router-dom'
import { routinesApi } from '../../api/routines'
import { aiApi } from '../../api/ai'
import { useAuthStore } from '../../store'
import type { Routine, DayDef, ExerciseDef } from '../../types/domain'
import { 
  IconTrash, IconArrowUp, IconArrowDown, IconPlus, 
  IconCheck, IconAI, IconDumbbell 
} from '../ui/Icons'

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
  const currentTargetDay = selectedTargetDay && dayIds.includes(selectedTargetDay) 
    ? selectedTargetDay 
    : (dayIds[0] ?? '')

  function addDay() {
    const dayId = `dia${Object.keys(days).length + 1}`
    setDays(d => ({ ...d, [dayId]: { id: dayId, label: `Día ${Object.keys(days).length + 1}`, subtitle: '', exercises: [{ ...EMPTY_EX }] } }))
    return dayId
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

  function injectSuggestedExercise(ex: { name: string; reps: string; sets: number; rest: number }) {
    let targetId = currentTargetDay
    if (!targetId) {
      targetId = addDay()
    }
    setDays(d => {
      const day = d[targetId]
      if (!day) return d
      // Si el primer ejercicio está vacío, lo sobrescribimos; si no, añadimos uno nuevo
      const exs = [...day.exercises]
      if (exs.length === 1 && !exs[0].name.trim()) {
        exs[0] = { ...ex }
      } else {
        exs.push({ ...ex })
      }
      return { ...d, [targetId]: { ...day, exercises: exs } }
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

  const suggestedExercises = EXERCISE_CATALOG[selectedMuscle] || []

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
                ✨ Asistente Inteligente IA
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
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)', padding: 'var(--space-2) 0', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <IconAlertTriangle size={14} strokeWidth={2} />
                Configura un proveedor y clave de IA en <strong>Configuración → IA</strong> para habilitar el generador automático.
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
                    {aiGenerating ? 'Estructurando rutina inteligente...' : <><IconBolt size={13} strokeWidth={2} /> Generar Rutina Completa</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* BUSCADOR ANATÓMICO (ESTILO MUSCLEWIKI) */}
      <section className="card-premium">
        <div className="panel-head" style={{ borderBottom: '1px solid var(--color-border)', padding: 'var(--space-3) var(--space-5)' }}>
          <h4 style={{ margin: 0, fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconDumbbell size={18} /> Buscador Anatómico de Ejercicios
          </h4>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            Selecciona un grupo muscular para ver sugerencias
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
          {/* MAPA SVG */}
          <div style={{ padding: 'var(--space-2)', background: 'var(--color-surface-offset)', borderRadius: 'var(--radius-lg)' }}>
            <AnatomicalMap selectedMuscle={selectedMuscle} onSelectMuscle={setSelectedMuscle} />
          </div>

          {/* LISTA DE SUGERENCIAS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-accent)' }}>
                EJERCICIOS PARA: {MUSCLE_LABELS[selectedMuscle]?.toUpperCase()}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Destino:</span>
                <select 
                  className="premium-input" 
                  style={{ padding: '2px 8px', fontSize: 'var(--text-xs)', height: 'auto', minWidth: '90px' }}
                  value={currentTargetDay}
                  onChange={e => setSelectedTargetDay(e.target.value)}
                >
                  {dayIds.map(id => (
                    <option key={id} value={id}>{days[id]?.label || id}</option>
                  ))}
                  {dayIds.length === 0 && <option value="">Crear Día 1</option>}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
              {suggestedExercises.map((ex, i) => (
                <div 
                  key={i} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '8px 12px', 
                    background: 'var(--color-surface-2)', 
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '3px solid var(--color-primary)'
                  }}
                >
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>{ex.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                      {ex.sets} series × {ex.reps} reps | Desc: {ex.rest}s
                    </div>
                  </div>
                  <button 
                    className="ghost-btn" 
                    style={{ padding: '4px 8px', fontSize: 'var(--text-xs)', background: 'var(--color-surface-offset)' }}
                    onClick={() => injectSuggestedExercise(ex)}
                    title="Añadir ejercicio a la rutina"
                  >
                    + Añadir
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

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

      {/* LISTADO DE DÍAS CONFIGURADOS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {Object.entries(days).map(([dayId, day]) => (
          <section key={dayId} className="card-premium">
            <div className="panel-head" style={{ background: 'var(--color-surface-2)', padding: 'var(--space-3) var(--space-5)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-3)', flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="day-id-badge">{dayId.toUpperCase()}</div>
                <div className="field" style={{ flex: 1, minWidth: 120, margin: 0 }}>
                  <input 
                    className="premium-input-ghost"
                    placeholder="Etiqueta (Ej. Torso A)" 
                    value={day.label} 
                    onChange={e => updateDayField(dayId, 'label', e.target.value)} 
                  />
                </div>
                <div className="field" style={{ flex: 2, minWidth: 180, margin: 0 }}>
                  <input 
                    className="premium-input-ghost tiny"
                    placeholder="Subtítulo (Ej. Pecho y tríceps)" 
                    value={day.subtitle} 
                    onChange={e => updateDayField(dayId, 'subtitle', e.target.value)} 
                  />
                </div>
              </div>
              <button className="icon-btn-danger" style={{ width: '32px', height: '32px' }} onClick={() => removeDay(dayId)}>
                <IconTrash size={16} />
              </button>
            </div>

            <div className="panel-body" style={{ padding: 'var(--space-3) var(--space-5)' }}>
              <div className="exercise-editor-list">
                {day.exercises.map((ex, idx) => (
                  <div key={idx} className="exercise-editor-row" style={{ alignItems: 'center' }}>
                    <div className="ex-main-info">
                      <div className="field" style={{ margin: 0 }}>
                        {idx === 0 && <label style={{ fontSize: '10px' }}>Ejercicio</label>}
                        <input 
                          placeholder="Nombre del ejercicio…" 
                          value={ex.name} 
                          onChange={e => updateExercise(dayId, idx, 'name', e.target.value)} 
                        />
                      </div>
                    </div>
                    <div className="ex-stats-info">
                      <div className="field" style={{ margin: 0 }}>
                        {idx === 0 && <label style={{ fontSize: '10px' }}>Reps</label>}
                        <input placeholder="10-12" value={ex.reps} onChange={e => updateExercise(dayId, idx, 'reps', e.target.value)} />
                      </div>
                      <div className="field" style={{ margin: 0 }}>
                        {idx === 0 && <label style={{ fontSize: '10px' }}>Series</label>}
                        <input type="number" placeholder="3" value={ex.sets} onChange={e => updateExercise(dayId, idx, 'sets', Number(e.target.value))} />
                      </div>
                      <div className="field" style={{ margin: 0 }}>
                        {idx === 0 && <label style={{ fontSize: '10px' }}>Desc. (s)</label>}
                        <input type="number" placeholder="90" value={ex.rest} onChange={e => updateExercise(dayId, idx, 'rest', Number(e.target.value))} />
                      </div>
                    </div>
                    <div className="ex-actions" style={{ marginTop: idx === 0 ? '16px' : 0 }}>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <button className="icon-btn-subtle" disabled={idx === 0} onClick={() => moveExercise(dayId, idx, 'up')}>
                          <IconArrowUp size={14} />
                        </button>
                        <button className="icon-btn-subtle" disabled={idx === day.exercises.length - 1} onClick={() => moveExercise(dayId, idx, 'down')}>
                          <IconArrowDown size={14} />
                        </button>
                        <button className="icon-btn-subtle danger" onClick={() => removeExercise(dayId, idx)}>
                          <IconTrash size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="add-ex-btn" style={{ marginTop: 'var(--space-2)' }} onClick={() => addExercise(dayId)}>
                <IconPlus size={14} /> Añadir ejercicio en blanco
              </button>
            </div>
          </section>
        ))}

        <button className="add-day-btn-premium" onClick={addDay}>
          <div className="add-icon"><IconPlus size={24} /></div>
          <span>Agregar nuevo día de entrenamiento</span>
        </button>
      </div>
    </div>
  )
}
