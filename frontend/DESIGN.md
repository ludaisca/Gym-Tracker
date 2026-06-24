# Design System Reference

Guía de referencia de clases CSS y tokens para mantener consistencia visual al crear o modificar vistas. Todo el CSS vive en `src/styles/globals.css`. No crear archivos `.css` separados ni usar Tailwind.

---

## Tokens de diseño

### Colores (custom properties)

```
--color-bg              fondo base de la página
--color-surface         superficie de cards y componentes (un tono sobre bg)
--color-surface-2       superficie secundaria (un tono sobre surface, interior de cards)
--color-surface-offset  hover sobre surface (menú lateral, hover en nav)

--color-border          borde de inputs y controles interactivos
--color-divider         separadores internos de cards (más sutil que border)

--color-text            texto principal
--color-text-muted      texto secundario / labels / descripciones
--color-text-faint      texto terciario / hints / placeholders
--color-text-inverse    texto sobre fondos de color (botones primary)

--color-primary         color de acento principal (teal en light, azul en dark)
--color-primary-hover   primary más oscuro para hover
--color-primary-highlight fondo tintado con primary (badges activos, cards activas)
--color-success         verde para estados completados
--color-success-highlight fondo tintado de success
--color-orange          naranja para alertas suaves / PR badges
--color-warning         naranja oscuro para alertas de error leves
--color-error           rojo para errores críticos
--color-error-highlight fondo tintado de error
--color-accent          alias de --color-primary (usar indistintamente)
```

Crear variantes con `color-mix()`:
```css
/* 15% de primary sobre transparente → fondo tintado */
background: color-mix(in srgb, var(--color-primary) 15%, transparent);

/* 5% de primary sobre surface-2 → header de card sutil */
background: color-mix(in srgb, var(--color-primary) 5%, var(--color-surface-2));

/* 6% de success → fondo de serie completada */
background: color-mix(in srgb, var(--color-success) 6%, transparent);
```

### Tipografía

```
--font-body   'Lexend', sans-serif      → todo el texto de UI
--font-mono   'JetBrains Mono', mono    → números, kg, reps, datos métricos, código

--text-xs     ~0.75–0.875rem   labels, meta, badges, hints
--text-sm     ~0.875–1rem      texto secundario, nombres en listas
--text-base   ~1–1.125rem      texto principal, títulos de cards
--text-lg     ~1.125–1.5rem    títulos de sección (panel-head h3)
--text-xl     ~1.5–2rem        títulos de topbar, KPIs
--text-2xl    ~1.75–2.5rem     KPIs grandes
```

Datos numéricos → siempre `font-family: var(--font-mono)`.

### Espaciado

```
--space-1  0.25rem    gap mínimo entre elementos inline
--space-2  0.5rem     gap entre elementos compactos
--space-3  0.75rem    gap estándar entre elementos de lista
--space-4  1rem       padding interno de cards pequeñas / gap entre secciones
--space-5  1.25rem    padding de cards medianas
--space-6  1.5rem     padding de contenido principal
--space-8  2rem       padding de secciones grandes
--space-10 2.5rem
--space-12 3rem       estado vacío / padding de empty states
```

### Radios de borde

```
--radius-sm    0.375rem   elementos muy pequeños
--radius-md    0.5rem     inputs, set-rows, badges internos
--radius-lg    0.75rem    cards pequeñas, botones estándar, toast
--radius-xl    1rem       cards principales, exercise-items, modales
--radius-full  9999px     pills, tags, botones primarios/ghost, chips
```

### Sombras y transición

```
--shadow-sm   sutil (1px, poca opacidad)  → cards, botones
--shadow-md   pronunciada (8-12px)         → modales, side panels
--transition  180ms cubic-bezier(0.16, 1, 0.3, 1)  → todos los estados interactivos
```

---

## Layout base

### Contenedor de página

```tsx
<div className="content fade-in">
  {/* max-width: min(100%, 1100px), padding: space-6, margin: auto */}
</div>
```

### Cabecera de sección con acción

```tsx
<div className="panel-head" style={{ padding: '0 0 var(--space-6)' }}>
  <div>
    <h3>Título</h3>
    <p>Subtítulo descriptivo.</p>
  </div>
  <button className="primary-btn"><IconPlus size={18} /> Acción</button>
</div>
```

### Card estándar

```tsx
<section className="card">
  <div className="panel-head">...</div>
  <div className="panel-body">...</div>
</section>
```

`.card` → `background: surface`, `border: divider`, `border-radius: xl`, `shadow-sm`.  
`.panel-head` → flex space-between, `border-bottom: divider`, padding `space-4 space-5`.  
`.panel-body` → padding `space-5`.

### Grid de dos columnas

```tsx
<div className="split">   {/* 1fr 1fr */}
<div className="triple">  {/* repeat(3, 1fr) */}
```

---

## Botones

Todos los botones son píldoras (`border-radius: var(--radius-full)`).

| Clase | Uso |
|---|---|
| `primary-btn` | Acción principal (fondo primary, texto inverso) |
| `primary-btn-outline` | Alternativa a primary sin relleno |
| `ghost-btn` | Acción secundaria / cancelar (borde, fondo surface) |
| `danger-btn` | Destructivo confirmado (rojo sólido, ancho 100%) |
| `danger-outline-btn` | Destructivo con previo aviso (borde warning, 100%) |
| `icon-btn` | Botón icono cuadrado 44×44px |
| `icon-btn-subtle` | Versión más discreta de icon-btn |
| `icon-btn-accent` | icon-btn con color accent |
| `icon-btn-danger` | icon-btn en rojo |

```tsx
<button className="primary-btn">Confirmar</button>
<button className="ghost-btn">Cancelar</button>
<button className="danger-btn">Eliminar definitivamente</button>
<button className="icon-btn"><IconEdit size={18} /></button>
```

---

## Overlays y hojas (bottom sheets / side panels)

**Regla crítica**: usar siempre `createPortal(..., document.body)`. Nunca renderizar modales dentro del árbol de la vista — quedan atrapados por `overflow: hidden` de cards padre.

### Selector de patrón

| Contenido | Overlay | Sheet |
|---|---|---|
| Confirmación simple, formulario corto | `confirm-overlay` | `confirm-sheet` |
| Timer SVG o contenido centrado | `confirm-overlay` | `timer-sheet` |
| Lista scrollable con header y botón X | `confirm-overlay` | `duelo-sheet` |
| Panel lateral con lista larga (editor) | `side-panel-overlay` | `side-panel` |

### Confirm sheet (modal de confirmación)

```tsx
createPortal(
  <div className="confirm-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
    <div className="confirm-sheet">
      <div className="confirm-sheet-handle" />
      <h3>Título de la acción</h3>
      <p className="confirm-sheet-text">Descripción o consecuencias.</p>
      <div className="confirm-sheet-actions">
        <button className="primary-btn" style={{ flex: 2 }}>Confirmar</button>
        <button className="ghost-btn" style={{ flex: 1 }}>Cancelar</button>
      </div>
    </div>
  </div>,
  document.body
)
```

### Duelo sheet (lista scrollable)

```tsx
<div className="duelo-sheet">
  <div className="confirm-sheet-handle" />
  <div className="duelo-sheet-header">
    <h3>Título</h3>
    <button className="icon-btn" onClick={onClose}><IconClose /></button>
  </div>
  <div className="duelo-sheet-body">
    {/* contenido scrollable */}
  </div>
</div>
```

### Side panel (panel lateral deslizante)

Usado en: preview de rutinas, editor de dashboard, editor de nav.

```tsx
createPortal(
  <div
    className={`side-panel-overlay ${open ? 'open' : ''}`}
    onClick={e => { if (e.target === e.currentTarget) onClose() }}
  >
    <div className="side-panel">
      <div className="side-panel-drag-handle" />   {/* visible solo en móvil */}

      <div className="side-panel-header">
        <div className="side-panel-title-area">
          <h3>Título del panel</h3>
          <p>Descripción breve</p>
        </div>
        <button className="side-panel-close-btn" onClick={onClose} aria-label="Cerrar">
          <IconClose size={18} />
          <span>Cerrar</span>
        </button>
      </div>

      <div className="side-panel-body">
        {/* contenido scrollable */}
      </div>

      <div className="side-panel-footer">
        <button className="primary-btn" style={{ flex: 1, padding: '1rem' }}>Guardar</button>
        <button className="ghost-btn" style={{ flex: 0 }}>Cancelar</button>
      </div>
    </div>
  </div>,
  document.body
)
```

El panel entra desde la derecha en desktop y desde abajo en móvil (<480px).

---

## Lista de ítems con sección agrupada

Patrón usado en la preview de rutinas. Aplica a cualquier lista de entidades agrupadas por categoría (ejercicios por día, alimentos por comida, rutinas por grupo, etc.).

### Estructura

```tsx
{grupos.map(grupo => (
  <div key={grupo.id} className="preview-day-card">

    {/* Cabecera del grupo */}
    <div className="preview-day-card-head">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span className="preview-day-label">{grupo.nombre}</span>
        {grupo.subtitulo && <span className="preview-day-subtitle">{grupo.subtitulo}</span>}
      </div>
      <span className="preview-day-badge">{grupo.items.length} elementos</span>
    </div>

    {/* Lista de ítems */}
    <div className="preview-day-exercises">
      {grupo.items.map((item, idx) => (
        <div key={idx} className="preview-exercise-item">

          {/* Lado izquierdo: índice + texto */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
            <span className="preview-exercise-idx">{idx + 1}</span>
            <div style={{ minWidth: 0 }}>
              <div className="preview-exercise-name">{item.nombre}</div>
              <div className="preview-exercise-rest">{item.detalle}</div>
            </div>
          </div>

          {/* Lado derecho: meta compacta */}
          <div className="preview-exercise-meta">{item.meta}</div>

        </div>
      ))}
    </div>

  </div>
))}
```

### Anatomía de los elementos

**`.preview-day-card`**  
Card con `background: surface-2`, `border: divider`, `border-radius: xl`, `overflow: hidden`.

**`.preview-day-card-head`**  
Header con fondo `color-mix(primary 5%, surface-2)` y `border-bottom: divider`. Flex space-between.

**`.preview-day-label`**  
Texto uppercase, `font-weight: 800`, `text-xs`, `letter-spacing: 0.05em`, color `primary`. Identifica el grupo.

**`.preview-day-subtitle`**  
Texto secundario `text-xs`, color `text-muted`. Descripción adicional del grupo.

**`.preview-day-badge`**  
Pill pequeña en la derecha del header. `10px`, borde `divider`, fondo `surface`. Muestra conteo.

**`.preview-exercise-item`**  
Fila flex space-between con `padding: space-3 space-4` y `border-bottom: divider`. El último ítem no tiene borde.

**`.preview-exercise-idx`**  
Círculo 22×22px, `background: color-mix(primary 12%, transparent)`, texto `primary`, `font-weight: 800`, `11px`. Flex-shrink: 0.

**`.preview-exercise-name`**  
Nombre principal. `font-weight: 600`, `text-sm`.

**`.preview-exercise-rest`**  
Línea de detalle. `10px`, color `text-faint`, `margin-top: 1px`.

**`.preview-exercise-meta`**  
Pill derecha con valor clave. `font-family: mono`, `11px`, color `text-muted`, `background: surface`, `padding: 2px 8px`, `border-radius: 4px`, `white-space: nowrap`, `flex-shrink: 0`.

---

## Tags, badges y pills

```tsx
/* Label de estado activo */
<span className="active-badge"><IconCheck size={12} /> Activa</span>

/* PR (record personal) */
<span className="pr-badge"><IconTrophy size={11} /> PR</span>

/* Tag mono (descanso, reps) */
<span className="rest-tag">⏱ 1:30</span>
<span className="rep-tag">8-12</span>

/* Pill genérica (mismo estilo que rest-tag/rep-tag) */
<span className="pill">Etiqueta</span>
```

Los tres últimos comparten la misma clase base: `font-size: text-xs`, `padding: 0.35rem 0.6rem`, `border-radius: full`, `background: surface`, `border: divider`, `font-family: mono`.

---

## Estados vacíos

```tsx
<div className="empty-state" style={{ padding: 'var(--space-12) 0' }}>
  <div className="empty-icon"><IconTarget size={48} /></div>
  <p>Mensaje descriptivo de por qué está vacío.</p>
  <button className="ghost-btn">Acción para salir del estado vacío</button>
</div>
```

---

## Señales UIStore para comunicación topbar → vista

Cuando el topbar necesita disparar una acción en una vista hija (abrir un editor, abrir un modal de configuración):

1. Añadir `fooOpen: boolean` + `openFoo/closeFoo` al UIStore (`store/index.ts`)
2. En `AppShell.tsx`: el botón del topbar llama `openFoo()`
3. En la vista: `useEffect(() => { if (fooOpen) { setLocalModal(true); closeFoo() } }, [fooOpen])`

Referencias existentes: `dashboardEditorOpen`, `nutritionGoalOpen`.

---

## Animaciones

```css
/* Entrada de vistas */
.fade-in → aplica a <div className="fade-in"> al montar la vista

/* Checkbox de ejercicio completado */
.exercise-item.done .exercise-check → checkPop (.22s ease)
```

Transición estándar para estados interactivos: `transition: var(--transition)` (180ms ease).

---

## Selector de patrón de modal — cuándo usar cada uno

Esta regla es definitiva tras la unificación de todos los modales del proyecto (junio 2026):

| Contenido | Patrón correcto |
|---|---|
| **Cualquier modal nuevo** | `side-panel-overlay` + `side-panel` + `createPortal` |
| Timer SVG / contenido centrado | `confirm-overlay` + `timer-sheet` (único caso que permanece) |

El `confirm-overlay` + `confirm-sheet` y el `duelo-sheet` ya **no se usan** para nuevos modales. Solo el `RestTimerModal` mantiene ese patrón por tratarse de un timer SVG animado que requiere estar centrado en pantalla.

### Archivos convertidos (referencia)

Todos los modales del proyecto usan ya el patrón side-panel:
- `Nutrition.tsx` → `FoodSheetModal` y `GoalModal`
- `MigrationModal.tsx` → importar historial
- `Config.tsx` → eliminar cuenta
- `Routines.tsx` → activar rutina
- `Duelos.tsx` → check-in, VERSUS, crear reto, unirse a reto

---

## Checklist al crear una nueva vista

- [ ] Contenedor raíz: `<div className="content fade-in">` o `<section className="card fade-in">`
- [ ] Datos numéricos: `font-family: var(--font-mono)`
- [ ] Modales: `side-panel-overlay` + `side-panel` + `createPortal(..., document.body)` — sin excepciones salvo timer SVG
- [ ] Listas agrupadas: patrón `preview-day-card` + `preview-exercise-item`
- [ ] Botones: clases del sistema (`primary-btn`, `ghost-btn`, `icon-btn`, etc.), nunca estilos inline
- [ ] Colores: siempre custom properties, nunca valores hex directos
- [ ] Estado vacío: `empty-state` con icono, mensaje y acción
- [ ] Espaciado: custom properties `--space-*`, nunca px directos salvo casos excepcionales
