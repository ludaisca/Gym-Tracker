import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { usersApi } from '../../api/users'
import { toast } from '../../lib/toast'
import { IconClose, IconArrowUp, IconArrowDown } from '../ui/Icons'
import type { DashboardWidgetConfig, WidgetType } from '../../types/domain'
import { DEFAULT_LAYOUT } from './Dashboard'

const WIDGET_META: Record<WidgetType, { label: string; desc: string; supportsHalf: boolean }> = {
  today:     { label: 'Hoy',              desc: 'Sesión del día con acceso directo al entrenamiento',       supportsHalf: true  },
  kpis:      { label: 'Métricas',         desc: 'Sesiones completadas, ejercicios, progreso y racha',       supportsHalf: false },
  heatmap:   { label: 'Historial',        desc: 'Mapa de calor de actividad de las últimas 12 semanas',      supportsHalf: false },
  week:      { label: 'Esta semana',      desc: 'Cards de cada día de la rutina con barra de progreso',     supportsHalf: false },
  volume:    { label: 'Volumen semanal',  desc: 'Total de kg × repeticiones levantados en la semana',       supportsHalf: true  },
  nutrition: { label: 'Nutrición hoy',   desc: 'Calorías, macros y agua registrados hoy',                  supportsHalf: true  },
}

interface Props {
  open: boolean
  layout: DashboardWidgetConfig[]
  onClose: () => void
  onSave: (layout: DashboardWidgetConfig[]) => void
}

export default function DashboardEditor({ open, layout, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<DashboardWidgetConfig[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setDraft([...layout].sort((a, b) => a.order - b.order))
  }, [open, layout])

  function toggle(id: string) {
    setDraft(prev => prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w))
  }

  function setWidth(id: string, width: 'full' | 'half') {
    setDraft(prev => prev.map(w => w.id === id ? { ...w, width } : w))
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...draft]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setDraft(next.map((w, i) => ({ ...w, order: i })))
  }

  function reset() {
    setDraft([...DEFAULT_LAYOUT].sort((a, b) => a.order - b.order))
  }

  async function save() {
    setSaving(true)
    try {
      await usersApi.updateSettings({ dashboardLayout: draft })
      onSave(draft)
      toast('Dashboard guardado')
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error ?? (err as Error)?.message ?? 'Error desconocido'
      toast(`Error al guardar: ${msg}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div
      className={`side-panel-overlay ${open ? 'open' : ''}`}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="side-panel">
        <div className="side-panel-drag-handle" />

        <div className="side-panel-header">
          <div className="side-panel-title-area">
            <h3>Personalizar inicio</h3>
            <p>Activa, reordena y ajusta el ancho de cada sección</p>
          </div>
          <button className="side-panel-close-btn" onClick={onClose} aria-label="Cerrar editor">
            <IconClose size={18} />
            <span>Cerrar</span>
          </button>
        </div>

        <div className="side-panel-body">
          {draft.map((w, index) => {
            const meta = WIDGET_META[w.type]
            return (
              <div key={w.id} className={`widget-editor-row ${w.visible ? '' : 'widget-editor-row--hidden'}`}>
                <div className="widget-editor-reorder">
                  <button
                    className="widget-editor-arrow"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Subir"
                  >
                    <IconArrowUp size={14} />
                  </button>
                  <button
                    className="widget-editor-arrow"
                    onClick={() => move(index, 1)}
                    disabled={index === draft.length - 1}
                    aria-label="Bajar"
                  >
                    <IconArrowDown size={14} />
                  </button>
                </div>

                <div className="widget-editor-info">
                  <div className="widget-editor-name">{meta.label}</div>
                  <div className="widget-editor-desc">{meta.desc}</div>
                  {meta.supportsHalf && w.visible && (
                    <div className="widget-editor-size">
                      <button
                        className={`widget-size-btn ${w.width === 'full' ? 'active' : ''}`}
                        onClick={() => setWidth(w.id, 'full')}
                      >
                        Completo
                      </button>
                      <button
                        className={`widget-size-btn ${w.width === 'half' ? 'active' : ''}`}
                        onClick={() => setWidth(w.id, 'half')}
                      >
                        Mitad
                      </button>
                    </div>
                  )}
                </div>

                <label className="widget-editor-toggle" aria-label={`${w.visible ? 'Ocultar' : 'Mostrar'} ${meta.label}`}>
                  <input
                    type="checkbox"
                    checked={w.visible}
                    onChange={() => toggle(w.id)}
                  />
                  <span className="widget-toggle-track" />
                </label>
              </div>
            )
          })}
        </div>

        <div className="side-panel-footer">
          <button className="primary-btn" style={{ flex: 1, padding: '1rem' }} onClick={save} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button className="ghost-btn" onClick={reset} disabled={saving}>
            Restablecer
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
