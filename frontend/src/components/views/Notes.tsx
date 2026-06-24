import { useState, useEffect, useRef } from 'react'
import { notesApi } from '../../api/notes'
import { sessionsApi } from '../../api/sessions'
import type { GlobalNote, WorkoutSession } from '../../types/domain'
import { SkeletonList } from '../ui/Skeleton'
import { IconCheck, IconTrash, IconEdit, IconArrowUp, IconArrowDown, IconNotes, IconClose } from '../ui/Icons'

type Filter = 'todas' | 'pendientes' | 'completadas'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

export default function Notes() {
  const [notes, setNotes] = useState<GlobalNote[]>([])
  const [sessionNotes, setSessionNotes] = useState<WorkoutSession[]>([])
  const [newText, setNewText] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('todas')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const newInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      notesApi.list(),
      sessionsApi.listAll(),
    ]).then(([n, sessions]) => {
      setNotes(n)
      setSessionNotes(
        sessions
          .filter(s => s.notes && s.notes.trim())
          .sort((a, b) => b.weekNumber - a.weekNumber)
          .slice(0, 12)
      )
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // ── CRUD ─────────────────────────────────────────────────────────────────

  async function addNote() {
    const text = newText.trim()
    if (!text) return
    const created = await notesApi.create(text)
    setNotes(prev => [...prev, created])
    setNewText('')
    newInputRef.current?.focus()
  }

  async function toggleNote(note: GlobalNote) {
    const updated = await notesApi.update(note.id, { done: !note.done })
    setNotes(prev => prev.map(n => n.id === note.id ? updated : n))
  }

  async function deleteNote(id: string) {
    if (pendingDelete !== id) {
      setPendingDelete(id)
      setTimeout(() => setPendingDelete(prev => prev === id ? null : prev), 3000)
      return
    }
    await notesApi.delete(id)
    setNotes(prev => prev.filter(n => n.id !== id))
    setPendingDelete(null)
  }

  async function clearCompleted() {
    const completed = notes.filter(n => n.done)
    await Promise.all(completed.map(n => notesApi.delete(n.id)))
    setNotes(prev => prev.filter(n => !n.done))
  }

  // ── Edición inline ───────────────────────────────────────────────────────

  function startEdit(note: GlobalNote) {
    setEditingId(note.id)
    setEditText(note.text)
  }

  async function saveEdit(id: string) {
    const text = editText.trim()
    if (!text) { setEditingId(null); return }
    const updated = await notesApi.update(id, { text })
    setNotes(prev => prev.map(n => n.id === id ? updated : n))
    setEditingId(null)
  }

  // ── Reordenamiento ───────────────────────────────────────────────────────

  async function moveNote(id: string, dir: 'up' | 'down') {
    const idx = notes.findIndex(n => n.id === id)
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === notes.length - 1) return
    const reordered = [...notes]
    const swap = dir === 'up' ? idx - 1 : idx + 1
    ;[reordered[idx], reordered[swap]] = [reordered[swap], reordered[idx]]
    setNotes(reordered)
    await notesApi.reorder(reordered.map(n => n.id))
  }

  // ── Derivados ────────────────────────────────────────────────────────────

  const total = notes.length
  const done = notes.filter(n => n.done).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const completedCount = done

  const filteredNotes = notes.filter(n => {
    if (filter === 'pendientes') return !n.done
    if (filter === 'completadas') return n.done
    return true
  })

  if (loading) return <SkeletonList count={5} />

  return (
    <div className="layout fade-in">
      {/* ── Columna principal: Checklist ──────────────────────── */}
      <section className="card">
        <div className="panel-head">
          <div>
            <h3>Checklist</h3>
            <p>Tareas repetibles para mantener la consistencia.</p>
          </div>
        </div>
        <div className="panel-body">
          {/* Barra de progreso */}
          {total > 0 && (
            <div className="notes-progress">
              <div className="notes-progress-label">
                <span>Progreso</span>
                <span className="notes-progress-count">{done}/{total} completadas · {pct}%</span>
              </div>
              <div className="progress">
                <span style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          {/* Toolbar: filtros + limpiar */}
          {total > 0 && (
            <div className="notes-toolbar">
              <div className="notes-filter-group">
                {(['todas', 'pendientes', 'completadas'] as Filter[]).map(f => (
                  <button
                    key={f}
                    className={`notes-filter-btn${filter === f ? ' active' : ''}`}
                    onClick={() => setFilter(f)}
                  >
                    {capitalize(f)}
                  </button>
                ))}
              </div>
              {completedCount > 0 && (
                <button className="ghost-btn" style={{ fontSize: 'var(--text-xs)', padding: '.3rem .75rem' }} onClick={clearCompleted}>
                  Limpiar {completedCount} ✓
                </button>
              )}
            </div>
          )}

          {/* Lista de notas */}
          <div className="task-grid">
            {filteredNotes.length === 0 && (
              <div className="empty-state" style={{ padding: 'var(--space-6) 0' }}>
                <div className="empty-icon"><IconNotes size={28} /></div>
                <p>
                  {filter === 'pendientes' && 'No tienes tareas pendientes. ¡Todo al día!'}
                  {filter === 'completadas' && 'Aún no has completado ninguna tarea.'}
                  {filter === 'todas' && 'Añade tu primera tarea de checklist abajo.'}
                </p>
              </div>
            )}

            {filteredNotes.map(note => {
              const realIdx = notes.findIndex(n => n.id === note.id)
              return (
                <article key={note.id} className={`task-card note-card${note.done ? ' done' : ''}`}>
                  <div className="note-row">
                    {/* Checkbox */}
                    <button className="task-check" onClick={() => toggleNote(note)} aria-label={note.done ? 'Marcar pendiente' : 'Marcar completada'}>
                      {note.done && <IconCheck size={13} />}
                    </button>

                    {/* Texto / Editor */}
                    <div>
                      {editingId === note.id ? (
                        <input
                          className="note-edit-input"
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveEdit(note.id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          onBlur={() => saveEdit(note.id)}
                          autoFocus
                        />
                      ) : (
                        <div className="note-text" onDoubleClick={() => startEdit(note)}>
                          {note.text}
                        </div>
                      )}
                      <div className="note-date">{formatDate(note.createdAt)}</div>
                    </div>

                    {/* Acciones */}
                    <div className="note-actions">
                      {filter === 'todas' && (
                        <>
                          <button
                            className="icon-btn-subtle note-reorder-btn"
                            disabled={realIdx === 0}
                            onClick={() => moveNote(note.id, 'up')}
                            aria-label="Subir"
                          >
                            <IconArrowUp size={13} />
                          </button>
                          <button
                            className="icon-btn-subtle note-reorder-btn"
                            disabled={realIdx === notes.length - 1}
                            onClick={() => moveNote(note.id, 'down')}
                            aria-label="Bajar"
                          >
                            <IconArrowDown size={13} />
                          </button>
                        </>
                      )}
                      {editingId !== note.id && (
                        <button className="icon-btn-subtle" onClick={() => startEdit(note)} aria-label="Editar">
                          <IconEdit size={13} />
                        </button>
                      )}
                      {editingId === note.id ? (
                        <button className="icon-btn-subtle" onClick={() => setEditingId(null)} aria-label="Cancelar edición">
                          <IconClose size={13} />
                        </button>
                      ) : (
                        <button
                          className={pendingDelete === note.id ? 'icon-btn-danger' : 'icon-btn-subtle'}
                          onClick={() => deleteNote(note.id)}
                          aria-label={pendingDelete === note.id ? 'Confirmar eliminación' : 'Eliminar'}
                          title={pendingDelete === note.id ? '¿Eliminar?' : 'Eliminar'}
                        >
                          {pendingDelete === note.id ? <IconCheck size={13} /> : <IconTrash size={13} />}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          {/* Formulario de nueva nota */}
          <div className="note-form">
            <div className="field">
              <label>Nueva tarea</label>
              <input
                ref={newInputRef}
                placeholder="Ej. Dormir 7+ horas"
                value={newText}
                onChange={e => setNewText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addNote()}
              />
            </div>
            <button className="primary-btn" onClick={addNote} disabled={!newText.trim()}>
              Agregar
            </button>
          </div>
        </div>
      </section>

      {/* ── Columna secundaria: Notas de sesiones ─────────────── */}
      <section className="card">
        <div className="panel-head">
          <div>
            <h3>Notas de sesiones</h3>
            <p>Lo que anotaste durante tus entrenos.</p>
          </div>
        </div>
        <div className="panel-body">
          {sessionNotes.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-6) 0' }}>
              <div className="empty-icon"><IconEdit size={28} /></div>
              <p>Tus notas de entrenamiento aparecerán aquí. Puedes añadirlas desde cualquier sesión activa.</p>
            </div>
          ) : (
            <div>
              {sessionNotes.map(s => (
                <div key={s.id} className="session-note-item">
                  <div className="session-note-header">
                    <span className="session-note-badge">S{s.weekNumber}</span>
                    <span className="session-note-day">{capitalize(s.dayId)}</span>
                  </div>
                  <div className="session-note-text">{s.notes}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
