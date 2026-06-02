import { useState, useEffect, useMemo } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { notesApi } from '../../api/notes'
import type { GlobalNote } from '../../types/domain'
import { Check, CheckSquare, Trash2 } from 'lucide-react'
import EmptyState from '../ui/EmptyState'

type Filter = 'all' | 'pending' | 'done'

function NoteItem({ note, onToggle, onDelete }: {
  note: GlobalNote
  onToggle: () => void
  onDelete: () => void
}) {
  const dragX = useMotionValue(0)
  const deleteBgOpacity = useTransform(dragX, [-100, -40], [1, 0])

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-md)' }}>
      <motion.div
        style={{ opacity: deleteBgOpacity }}
        className="swipe-delete-bg"
      >
        <Trash2 size={16} />
      </motion.div>
      <motion.article
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        style={{ x: dragX, touchAction: 'pan-y' }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -80) onDelete()
        }}
        className="task-card"
      >
        <div className="exercise-top">
          <button className="task-check" onClick={onToggle}>
            {note.done ? <Check size={16} /> : ''}
          </button>
          <div style={{ flex: 1 }}>
            <div
              className={`exercise-name${note.done ? ' muted' : ''}`}
              style={note.done ? { textDecoration: 'line-through' } : {}}
            >
              {note.text}
            </div>
          </div>
        </div>
      </motion.article>
    </div>
  )
}

export default function Notes() {
  const [notes, setNotes] = useState<GlobalNote[]>([])
  const [newText, setNewText] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    notesApi.list().then(setNotes).catch((err: unknown) => console.warn("[load]", err)).finally(() => setLoading(false))
  }, [])

  async function addNote() {
    const text = newText.trim()
    if (!text) return
    const created = await notesApi.create(text)
    setNotes(prev => [...prev, created])
    setNewText('')
  }

  async function toggleNote(note: GlobalNote) {
    const updated = await notesApi.update(note.id, { done: !note.done })
    setNotes(prev => prev.map(n => n.id === note.id ? updated : n))
  }

  async function deleteNote(id: string) {
    await notesApi.delete(id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  const filtered = useMemo(() => {
    if (filter === 'pending') return notes.filter(n => !n.done)
    if (filter === 'done') return notes.filter(n => n.done)
    return notes
  }, [notes, filter])

  const pendingCount = notes.filter(n => !n.done).length
  const doneCount = notes.filter(n => n.done).length

  if (loading) return <div className="content"><div className="spinner" /></div>

  return (
    <div className="fade-in layout">
      <section className="card">
        <div className="panel-head">
          <div><h3>Checklist global</h3><p>Tareas repetibles para no perder consistencia.</p></div>
        </div>
        <div className="panel-body task-grid">
          <div className="field">
            <label>Nuevo item</label>
            <input
              placeholder="Ej. Dormir 7+ horas"
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addNote()}
            />
          </div>
          <button className="primary-btn" onClick={addNote}>Agregar item</button>

          <div className="stats-tabs" style={{ marginTop: 'var(--space-2)' }}>
            {(['all', 'pending', 'done'] as Filter[]).map(f => (
              <button
                key={f}
                className={`stats-tab-btn${filter === f ? ' active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? `Todas (${notes.length})` : f === 'pending' ? `Pendientes (${pendingCount})` : `Completadas (${doneCount})`}
              </button>
            ))}
          </div>

          {filtered.length === 0 && notes.length === 0 && (
            <EmptyState
              icon={<CheckSquare size={32} />}
              title="Sin tareas todavía"
              body="Añade un recordatorio o checklist recurrente."
            />
          )}

          {filtered.length === 0 && notes.length > 0 && (
            <p className="tiny muted" style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
              {filter === 'pending' ? 'Todo completado.' : 'Nada completado aún.'}
            </p>
          )}

          {filtered.map(note => (
            <NoteItem
              key={note.id}
              note={note}
              onToggle={() => toggleNote(note)}
              onDelete={() => deleteNote(note.id)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
