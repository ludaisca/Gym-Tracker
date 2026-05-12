import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { routinesApi } from '../../api/routines'
import type { Routine, DayDef, ExerciseDef } from '../../types/domain'

const EMPTY_EX: ExerciseDef = { name: '', reps: '10-12', rest: 90, sets: 3 }

export default function RoutineEditor() {
  const navigate = useNavigate()
  const { routineId } = useParams<{ routineId?: string }>()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [days, setDays] = useState<Record<string, DayDef>>({})
  const [saving, setSaving] = useState(false)

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

  function addDay() {
    const dayId = `dia${Object.keys(days).length + 1}`
    setDays(d => ({ ...d, [dayId]: { id: dayId, label: 'Nuevo día', subtitle: '', exercises: [{ ...EMPTY_EX }] } }))
  }

  function removeDay(dayId: string) {
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
    <>
      <div className="panel-head" style={{ padding: '0 0 var(--space-4)' }}>
        <div><h3>{routineId ? 'Editar rutina' : 'Nueva rutina'}</h3></div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="ghost-btn" onClick={() => navigate('/rutinas')}>Cancelar</button>
          <button className="primary-btn" onClick={save} disabled={saving || !name.trim()}>
            {saving ? 'Guardando…' : 'Guardar rutina'}
          </button>
        </div>
      </div>

      <section className="card">
        <div className="panel-body triple">
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Nombre de la rutina</label>
            <input placeholder="Ej. Mi rutina personalizada" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Descripción (opcional)</label>
            <input placeholder="Breve descripción del objetivo de la rutina" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
        </div>
      </section>

      {Object.entries(days).map(([dayId, day]) => (
        <section key={dayId} className="card">
          <div className="panel-head">
            <div style={{ display: 'flex', gap: 'var(--space-3)', flex: 1, flexWrap: 'wrap' }}>
              <div className="field" style={{ flex: 1, minWidth: 140 }}>
                <label>Nombre del día</label>
                <input placeholder="lunes" value={dayId} readOnly style={{ opacity: .6 }} />
              </div>
              <div className="field" style={{ flex: 1, minWidth: 140 }}>
                <label>Etiqueta</label>
                <input placeholder="Torso A" value={day.label} onChange={e => updateDayField(dayId, 'label', e.target.value)} />
              </div>
              <div className="field" style={{ flex: 2, minWidth: 200 }}>
                <label>Subtítulo</label>
                <input placeholder="Empuje: pecho, hombro, tríceps" value={day.subtitle} onChange={e => updateDayField(dayId, 'subtitle', e.target.value)} />
              </div>
            </div>
            <button className="ghost-btn" style={{ padding: '.45rem .8rem', color: 'var(--color-warning)', flexShrink: 0 }} onClick={() => removeDay(dayId)}>
              Eliminar día
            </button>
          </div>
          <div className="panel-body">
            {day.exercises.map((ex, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px 60px auto', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', alignItems: 'end' }}>
                <div className="field" style={{ margin: 0 }}>
                  {idx === 0 && <label>Ejercicio</label>}
                  <input placeholder="Press de banca…" value={ex.name} onChange={e => updateExercise(dayId, idx, 'name', e.target.value)} />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  {idx === 0 && <label>Reps</label>}
                  <input placeholder="10-12" value={ex.reps} onChange={e => updateExercise(dayId, idx, 'reps', e.target.value)} />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  {idx === 0 && <label>Descanso s</label>}
                  <input type="number" placeholder="90" value={ex.rest} onChange={e => updateExercise(dayId, idx, 'rest', Number(e.target.value))} />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  {idx === 0 && <label>Series</label>}
                  <input type="number" placeholder="3" value={ex.sets} onChange={e => updateExercise(dayId, idx, 'sets', Number(e.target.value))} />
                </div>
                <button className="icon-btn" style={{ marginBottom: idx === 0 ? 0 : 0, alignSelf: 'end', marginTop: idx === 0 ? '1.5rem' : 0 }} onClick={() => removeExercise(dayId, idx)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
            <button className="ghost-btn" style={{ marginTop: 'var(--space-2)', padding: '.4rem .9rem', fontSize: 'var(--text-xs)' }} onClick={() => addExercise(dayId)}>
              + Agregar ejercicio
            </button>
          </div>
        </section>
      ))}

      <button className="ghost-btn" onClick={addDay} style={{ width: '100%', padding: 'var(--space-4)', borderStyle: 'dashed' }}>
        + Agregar día de entrenamiento
      </button>
    </>
  )
}
