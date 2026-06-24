# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> La arquitectura general del proyecto completo está en `../CLAUDE.md`. Este archivo se enfoca en patrones y decisiones específicas del código dentro de `frontend/`.
> El sistema de diseño visual (tokens, clases, patrones de listas, overlays, checklist) está en `DESIGN.md`. Leerlo antes de crear o modificar cualquier vista.

---

## Comandos

```bash
npm run dev        # Vite dev server en :5173 (proxy /api → :3001)
npm run build      # tsc -b && vite build
npm run lint       # ESLint
npx tsc -b         # Type-check sin emitir (ejecutar después de cualquier cambio)
```

---

## CSS — un solo archivo

Todo el CSS vive en `src/styles/globals.css`. No hay CSS Modules ni Tailwind. El sistema se basa en custom properties definidas en `:root` y sobreescritas por `[data-theme]` y `[data-accent]`.

**Añadir estilos**: busca el bloque temático correspondiente en `globals.css` (hay comentarios `/* ── Nombre ── */`) y añade allí. No crear archivos `.css` separados.

**Accent themes**: `[data-accent="teal|forest|ocean|ember|violet"]`. Al añadir uno nuevo, registrarlo también en el array `ACCENT_THEMES` de `Config.tsx`.

**`color-mix()`** es la función estándar para variantes de color (highlight, hover, etc.):
```css
background: color-mix(in srgb, var(--color-primary) 15%, transparent);
```

---

## Patrones críticos

### Modales — patrón único: side-panel

**Regla**: todos los modales usan `side-panel-overlay` + `side-panel` + `createPortal(..., document.body)`. Sin excepciones salvo el timer de descanso.

| Caso | Patrón |
|---|---|
| Cualquier modal nuevo | `side-panel-overlay` + `side-panel` |
| Timer SVG (RestTimerModal) | `confirm-overlay` + `timer-sheet` — único caso que se mantiene |

`confirm-sheet` y `duelo-sheet` están descontinuados para nuevos modales. Ya no usar.

Estructura de un `confirm-sheet`:
```tsx
createPortal(
  <div className="confirm-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
    <div className="confirm-sheet">
      <div className="confirm-sheet-handle" />
      <h3>Título</h3>
      <p className="confirm-sheet-text">Descripción opcional</p>
      <div className="confirm-sheet-actions">
        <button className="primary-btn">Confirmar</button>
        <button className="ghost-btn">Cancelar</button>
      </div>
    </div>
  </div>,
  document.body
)
```

Para contenido scrollable (listas largas, stats), usar `duelo-sheet`:
```tsx
<div className="duelo-sheet">
  <div className="confirm-sheet-handle" />
  <div className="duelo-sheet-header">
    <h3>Título</h3>
    <button className="icon-btn" onClick={onClose}><IconClose /></button>
  </div>
  <div className="duelo-sheet-body">{/* contenido scrollable */}</div>
</div>
```

**Botones** dentro de sheets — usar siempre estas clases (todas son píldoras con `border-radius: var(--radius-full)`):
- `primary-btn` — acción principal
- `ghost-btn` — acción secundaria / cancelar
- `danger-btn` — acción destructiva irreversible (rojo, ancho completo)
- `danger-outline-btn` — acción destructiva con borde (más suave, para mostrar antes de confirmar)

### UIStore signal para comunicación topbar → vista

Cuando el topbar necesita abrir un panel en una vista hija (ej. engranaje de Nutrición abre GoalModal):
1. Añadir `fooOpen: boolean` + `openFoo/closeFoo` actions al UIStore en `store/index.ts`
2. En `AppShell.tsx`: botón en topbar llama `openFoo()`
3. En la vista: `useEffect(() => { if (fooOpen) { setLocalModal(true); closeFoo() } }, [fooOpen])`

Ver `dashboardEditorOpen` y `nutritionGoalOpen` como referencia.

### Dashboard widget layout merge

Cuando se añade un nuevo `WidgetType`, el layout guardado del usuario no lo tendrá. El patrón en `Dashboard.tsx` inyecta widgets faltantes al final con `visible: false`:
```typescript
const missing = DEFAULT_LAYOUT.filter(w => !savedTypes.has(w.type))
return [...saved, ...missing.map((w, i) => ({ ...w, order: maxOrder + i + 1 }))]
```

### `useEnsuredSession` — prevención de race conditions

`useSessions.ts` usa `flushSeqRef` para ignorar respuestas de requests superadas:
```typescript
const seq = ++flushSeqRef.current
// ...en la respuesta:
if (seq === flushSeqRef.current) setSession(result)
```
El debounce de 800ms cancela timeouts pendientes pero NO requests ya en vuelo. Sin este guard, una respuesta tardía puede sobrescribir el estado optimista más reciente.

### Exercise done vs. set completed

`ExerciseSession.done` (nivel ejercicio, togglado por el checkbox) y `SetData.completed` (nivel serie, togglado por el círculo) son estados independientes. `toggleDone` en `DayView` propaga `completed: true` a todos los sets con `kg+reps` al marcar done, para mantener consistencia. No romper esta lógica.

---

## Build

Vite hace code-splitting manual en `vite.config.ts`: React/Router → `vendor-react`, Recharts → `vendor-charts`, Zustand → `vendor-store`. Las API calls usan `NetworkFirst` con timeout 5s y caché 24h (Workbox). El SW **no corre en `npm run dev`** — solo en build/preview.
