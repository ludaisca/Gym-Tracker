# Plan de Rediseño Completo — Gym Tracker

## Contexto
La app tiene buen set de features pero problemas visuales sistémicos: exceso de scroll vertical, cards anidadas en todas las vistas, panel-head/panel-body pesado en todas partes, tipografía genérica, y KPIs duplicados entre vistas. El DayView ya fue rediseñado como referencia del nuevo sistema. Este plan extiende ese lenguaje al resto de la app.

**Principio rector:** "Menos chrome, más datos. Menos modales, más inline. Menos tabs, más scroll."

---

## 1. Sistema de Diseño (Capa Base)

### Tipografía — cambio de fuente para headings
| Rol | Fuente actual | Nueva fuente |
|-----|---------------|--------------|
| Headings display (h1, h2) | Lexend | **Barlow Condensed** (400-800) |
| Body / UI | Lexend | Lexend (mantener) |
| Números / datos | JetBrains Mono | JetBrains Mono (mantener) |

Barlow Condensed es la fuente canónica de la industria fitness (Nike Training, Strong, Hevy).
Añadir en globals.css:
```css
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;700;800&display=swap');
--font-display: 'Barlow Condensed', var(--font-body);
```

### Tokens de color — ajustes OLED-dark
| Token | Valor actual (dark) | Nuevo valor | Razón |
|-------|---------------------|-------------|-------|
| `--color-primary` | `#4f98a3` | `#5fb3c0` | +10% brillo, más visible en OLED |
| `--color-success` | `#6daa45` | `#71c247` | Más vibrante |
| `--color-energy` | no existe | `#f5a623` | Naranja para acciones de workout activo |

### Animaciones — regla global
- CSS-only en accordions/listas (Framer Motion falla en WebView Android)
- Framer Motion solo para: page transitions, toasts, modales fullscreen
- Duration: 140-200ms, transform/opacity únicamente (nunca height/width)

### Patrón de layout — deprecar panel-head/panel-body
El border-bottom del panel-head ya se eliminó. Siguiente paso: no usar panel-head/panel-body en vistas nuevas.
Nuevo sistema: `.dv-section-label` + `hr.section-sep` + contenido directo (ver DayView como referencia).

---

## 2. Navegación — 5 tabs fijos (cortar nav customizable)

| Tab | Ícono | Contenido |
|-----|-------|-----------|
| **Inicio** | House | Dashboard (today + KPIs + heatmap) |
| **Entrena** | Dumbbell | DayView / Agenda semanal / Historial |
| **Stats** | ChartBar | Analytics + Insights IA + Logros |
| **Nutrición** | Apple | Nutrition + Cardio metrics |
| **Perfil** | User | Config + Rutinas + Cuenta |

Eliminar: bottom nav personalizable, NavEditor modal, fullscreen hamburger menu.
Topbar: solo título de sección + theme toggle (max 2 acciones).

---

## 3. Feature Audit

### Eliminar / Simplificar
| Feature | Decisión |
|---------|----------|
| Marketplace (tab en Rutinas) | Eliminar tab — dejar solo share/import por código |
| Cardio como página separada `/cardio` | Fusionar: métricas → Stats; registro → DayView |
| Agenda como página separada `/agenda` | Fusionar como pestaña "Semana" dentro de Dashboard |
| Bottom nav personalizable | Eliminar — 5 tabs fijos |
| KPIs duplicados (Stats + Insights) | Eliminar de Insights, solo en Stats |
| Weekly Brief en Dashboard | Mover a Insights — Dashboard solo muestra datos |

### Agregar
| Feature | Complejidad |
|---------|-------------|
| Feed de PRs recientes en Dashboard | Baja |
| Timer flotante en topbar durante sesión activa | Media |
| Medidas corporales (cintura, pecho, brazos) en Stats | Media |
| Vista rápida: tap en ejercicio del "widget de hoy" → abre directo | Baja |

---

## 4. Plan por Pantalla

### Dashboard (FASE 2)
Nuevo layout — eliminar 4 KPIs separados, hero card prominente:
```
┌─────────────────────────────────────────┐
│  LUNES — Semana 12           Racha: 4   │  ← header compacto
├─────────────────────────────────────────┤
│  HOY                                    │
│  Pecho y Tríceps · 6 ejercicios        │  ← hero card grande
│  [░░░░░░░░░░░░░░] 0/6   [EMPEZAR →]   │
├─────────────────────────────────────────┤
│  Esta semana                            │
│  [L✓][M·][X·][J·][V·][S·][D·]         │  ← dots horizontales
│  3 sesiones completadas · 12,400 kg    │
├─────────────────────────────────────────┤
│  PR reciente (solo si hay)              │
│  Sentadilla — 102.5 kg ↑ +2.5 kg      │
├─────────────────────────────────────────┤
│  [Actividad 8 semanas — heatmap]        │
└─────────────────────────────────────────┘
```

### Stats (FASE 3) — eliminar 6 tabs, un solo scroll
```
KPIs (racha, volumen, sesiones)     [semana ▾]
Volumen semanal                     [line chart]
Mejor levantamiento                 [top 3 + sparkline]
Mapa muscular                       [SVG body compacto]
Objetivos 1RM                       [barras progreso]
Peso corporal                       [chart + form inline]
Logros                              [grid 3-col]
```

### Nutrition (FASE 4) — barras en vez de gauges SVG
```
← [Hoy, 28 may] →
Calorías restantes: 1,240 de 2,500
P  ██████░░  62g / 180g
C  ████░░░░  120g / 250g
G  ███░░░░░  45g / 70g
Agua  [●●●●●●○○] 6/8 (fila compacta)
Desayuno (+) [colapsable]
Almuerzo (+) [colapsable]
...
```

### Rutinas (FASE 5)
- Eliminar tab Marketplace
- Grid 2-col de program cards con días como pills de colores
- Acciones por tarjeta: condensadas en menú `···`

### Config (FASE 6)
- Ya mejorado a 3 cards — tweaks menores
- Eliminar "Sincronización offline" del Config → badge en topbar si hay pending

### SessionHistory (FASE 7)
- Timeline vertical con dots, sin accordion anidado

### Duelos (FASE 7)
- Reducir a 1 modal unificado (crear/unirse)
- VS bar con mejor layout mobile

---

## 5. Orden de Implementación

| # | Tarea | Impacto | Esfuerzo |
|---|-------|---------|----------|
| 1 | globals.css: Barlow Condensed + token --color-energy | Todo | Bajo |
| 2 | AppShell: 5 tabs fijos, eliminar nav customizable | Navegación | Medio |
| 3 | Dashboard: hero card + week strip + PR feed | Home | Medio |
| 4 | Stats: single scroll sin tabs | Analytics | Alto |
| 5 | Nutrition: barras + meals colapsables | Nutrición | Medio |
| 6 | Rutinas: eliminar marketplace | Rutinas | Bajo |
| 7 | SessionHistory + Duelos + Notas | Resto | Bajo |

---

## 6. Estado actual (referencia)

### Ya rediseñado ✓
- `DayView.tsx` — layout plano, hero header, dots de progreso
- `ExerciseCard.tsx` — sin Framer Motion, número de ejercicio, done-check
- `SetBox.tsx` — set rows horizontales touch-first, createPortal para platos
- `Config.tsx` — 8 cards → 3 secciones con section-sep
- `globals.css` — panel-head sin border-bottom, section-sep, inner-card, dark mode summary-card fix

### Sin cambios (no tocar)
- Toda la lógica de negocio (hooks, stores, API)
- Backend / Prisma / Redis
- Auth pages
- PlateCalcModal, RestTimerModal
- Sistema de routing
- Variables de entorno

---

## 7. Criterios de éxito
1. Sin `panel-head`/`panel-body` en vistas nuevas
2. Sin `section.card` como wrapper de página completa
3. Ninguna vista con más de 3 secciones antes de ver datos clave
4. Todas las acciones principales en máximo 2 taps desde home
5. Barlow Condensed en todos los títulos de página y métricas grandes
6. Navegación: 5 tabs fijos, sin hamburguesa
