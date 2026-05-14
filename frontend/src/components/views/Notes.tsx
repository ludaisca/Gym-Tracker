import { useState, useEffect } from 'react'
import { notesApi } from '../../api/notes'
import type { GlobalNote } from '../../types/domain'

export default function Notes() {
  const [notes, setNotes] = useState<GlobalNote[]>([])
  const [newText, setNewText] = useState('')
  const [loading, setLoading] = useState(true)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  useEffect(() => {
    notesApi.list().then(setNotes).catch(() => {}).finally(() => setLoading(false))
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
    if (pendingDelete !== id) {
      setPendingDelete(id)
      setTimeout(() => setPendingDelete(prev => prev === id ? null : prev), 3000)
      return
    }
    await notesApi.delete(id)
    setNotes(prev => prev.filter(n => n.id !== id))
    setPendingDelete(null)
  }

  if (loading) return <div className="content"><div className="spinner" /></div>

  return (
    <div className="layout">
      <section className="card">
        <div className="panel-head">
          <div><h3>Checklist global</h3><p>Tareas repetibles para no perder consistencia.</p></div>
        </div>
        <div className="panel-body task-grid">
          {notes.map(note => (
            <article key={note.id} className="task-card">
              <div className="exercise-top">
                <button className="task-check" onClick={() => toggleNote(note)}>
                  {note.done ? '✓' : ''}
                </button>
                <div style={{ flex: 1 }}>
                  <div className={`exercise-name${note.done ? ' muted' : ''}`} style={note.done ? { textDecoration: 'line-through' } : {}}>
                    {note.text}
                  </div>
                  <div className="task-meta">Checklist general de operación</div>
                </div>
                {pendingDelete === note.id ? (
                  <button
                    className="icon-btn"
                    style={{ width: 28, height: 28, color: 'var(--danger)', borderColor: 'var(--danger)' }}
                    onClick={() => deleteNote(note.id)}
                    title="Confirmar eliminación"
                  >
                    ✓
                  </button>
                ) : (
                  <button
                    className="icon-btn"
                    style={{ width: 28, height: 28 }}
                    onClick={() => deleteNote(note.id)}
                    title="Eliminar"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            </article>
          ))}
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
        </div>
      </section>
    </div>
  )
}
