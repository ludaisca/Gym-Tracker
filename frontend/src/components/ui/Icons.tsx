/**
 * Icon system — monochrome SVGs using currentColor.
 * All icons adapt automatically to light/dark theme via CSS color inheritance.
 * Inspired by minimal line-icon sets (Feather / Heroicons style).
 */

interface IconProps {
  size?: number
  strokeWidth?: number
  className?: string
  style?: React.CSSProperties
}

const def = (size = 20, sw = 1.75) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: sw,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export function IconHome({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  )
}

export function IconCalendar({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

export function IconNutrition({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <path d="M12 2C8 2 4 6 4 10c0 5 4 8 8 8s8-3 8-8c0-4-4-8-8-8Z"/>
      <path d="M12 6v12"/>
      <path d="M8 9.5c0 0 1.5 2 4 2s4-2 4-2"/>
    </svg>
  )
}

export function IconStats({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )
}

export function IconAI({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V10a3 3 0 0 1 3-3h1V6a4 4 0 0 1 4-4Z"/>
      <circle cx="9" cy="13" r="1" fill="currentColor" stroke="none"/>
      <circle cx="15" cy="13" r="1" fill="currentColor" stroke="none"/>
      <path d="M9 17c.83.67 1.67 1 3 1s2.17-.33 3-1"/>
    </svg>
  )
}

export function IconTrophy({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <path d="M6 4h12v8a6 6 0 0 1-12 0V4Z"/>
      <path d="M6 8H3a1 1 0 0 0-1 1v1a4 4 0 0 0 4 4"/>
      <path d="M18 8h3a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4"/>
      <line x1="12" y1="18" x2="12" y2="21"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
    </svg>
  )
}

export function IconDumbbell({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <path d="M6 4v16M18 4v16"/>
      <path d="M3 7v10M21 7v10"/>
      <line x1="6" y1="12" x2="18" y2="12"/>
    </svg>
  )
}

export function IconTarget({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  )
}

export function IconRun({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <circle cx="13" cy="4" r="1.5"/>
      <path d="M10 8.5l-2 4.5H5l2 5"/>
      <path d="M10 8.5l3 1.5 2-3.5"/>
      <path d="M13 10l2 4.5 2.5 1.5"/>
    </svg>
  )
}

export function IconNotes({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="8" y1="13" x2="16" y2="13"/>
      <line x1="8" y1="17" x2="12" y2="17"/>
    </svg>
  )
}

export function IconSettings({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
    </svg>
  )
}

export function IconSun({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
}

export function IconMoon({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/>
    </svg>
  )
}

export function IconMenu({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  )
}

export function IconClose({ size = 20, strokeWidth = 2, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

export function IconChevronLeft({ size = 20, strokeWidth = 2, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  )
}

export function IconChevronRight({ size = 20, strokeWidth = 2, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

export function IconPlus({ size = 20, strokeWidth = 2, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}

export function IconCheck({ size = 20, strokeWidth = 2.5, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

export function IconUser({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

export function IconCamera({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}

export function IconMail({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  )
}

export function IconLock({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}

export function IconStar({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}

export function IconFire({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
    </svg>
  )
}

export function IconStarFilled({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor"/>
    </svg>
  )
}

export function IconRocket({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 2s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-5c1.62-2.2 5-3 5-3"/>
      <path d="M12 15v5s3.03-.55 5-2c2.2-1.62 3-5 3-5"/>
    </svg>
  )
}

export function IconGripVertical({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <circle cx="9" cy="6" r="1" fill="currentColor" stroke="none"/>
      <circle cx="15" cy="6" r="1" fill="currentColor" stroke="none"/>
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none"/>
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/>
      <circle cx="9" cy="18" r="1" fill="currentColor" stroke="none"/>
      <circle cx="15" cy="18" r="1" fill="currentColor" stroke="none"/>
    </svg>
  )
}

export function IconArrowUp({ size = 20, strokeWidth = 2, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <line x1="12" y1="19" x2="12" y2="5"/>
      <polyline points="5 12 12 5 19 12"/>
    </svg>
  )
}

export function IconArrowDown({ size = 20, strokeWidth = 2, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <line x1="12" y1="5" x2="12" y2="19"/>
      <polyline points="19 12 12 19 5 12"/>
    </svg>
  )
}

export function IconTrash({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/>
      <path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}

export function IconCopy({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  )
}

export function IconEye({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

export function IconEdit({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

export function IconLogout({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}

export function IconDownload({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

export function IconUpload({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  )
}

export function IconBolt({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <path d="M13 2L4.09 12.96A1 1 0 0 0 5 14.5h6.5L10 22l8.91-10.96A1 1 0 0 0 18 9.5H11.5L13 2Z"/>
    </svg>
  )
}

export function IconAlertTriangle({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}

export function IconInfo({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  )
}

export function IconShield({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>
    </svg>
  )
}

export function IconCrown({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <path d="M2 20h20"/>
      <polyline points="5 20 5 9 12 3 19 9 19 20"/>
      <path d="M5 13l7-2 7 2"/>
    </svg>
  )
}

export function IconMountain({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <path d="m3 20 6-12 4 5 3-4 5 11H3Z"/>
      <path d="M13.5 8h1"/>
    </svg>
  )
}

export function IconHeart({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )
}

export function IconLeaf({ size = 20, strokeWidth = 1.75, className, style }: IconProps) {
  return (
    <svg {...def(size, strokeWidth)} className={className} style={style}>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
    </svg>
  )
}

// ── Avatar icon system ────────────────────────────────────────────────────
export const AVATAR_IDS = [
  'dumbbell', 'fire', 'bolt', 'target', 'trophy', 'rocket',
  'star', 'shield', 'crown', 'mountain', 'heart', 'leaf',
] as const
export type AvatarId = typeof AVATAR_IDS[number]

export function AvatarIcon({ id, size = 28, strokeWidth = 1.75 }: { id: string; size?: number; strokeWidth?: number }) {
  const p = { size, strokeWidth }
  switch (id) {
    case 'dumbbell':  return <IconDumbbell {...p} />
    case 'fire':      return <IconFire {...p} />
    case 'bolt':      return <IconBolt {...p} />
    case 'target':    return <IconTarget {...p} />
    case 'trophy':    return <IconTrophy {...p} />
    case 'rocket':    return <IconRocket {...p} />
    case 'star':      return <IconStarFilled {...p} />
    case 'shield':    return <IconShield {...p} />
    case 'crown':     return <IconCrown {...p} />
    case 'mountain':  return <IconMountain {...p} />
    case 'heart':     return <IconHeart {...p} />
    case 'leaf':      return <IconLeaf {...p} />
    default:          return <IconDumbbell {...p} />
  }
}

export function UserAvatar({ avatar, size = 28 }: { avatar?: string; size?: number }) {
  if (avatar?.startsWith('data:')) {
    return <img src={avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
  }
  return <AvatarIcon id={avatar ?? 'dumbbell'} size={size} />
}

// Module-to-icon mapping for AppShell / nav
export function ModuleIcon({ path, size = 20, strokeWidth = 1.75 }: { path: string; size?: number; strokeWidth?: number }) {
  const props = { size, strokeWidth }
  switch (path) {
    case '/dashboard': return <IconHome {...props} />
    case '/agenda':    return <IconCalendar {...props} />
    case '/nutricion': return <IconNutrition {...props} />
    case '/stats':     return <IconStats {...props} />
    case '/insights':  return <IconAI {...props} />
    case '/duelos':    return <IconTrophy {...props} />
    case '/rutinas':   return <IconTarget {...props} />
    case '/cardio':    return <IconRun {...props} />
    case '/notas':     return <IconNotes {...props} />
    case '/config':    return <IconSettings {...props} />
    default:           return <IconHome {...props} />
  }
}
