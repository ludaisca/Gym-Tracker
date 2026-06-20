import { useToastItems } from '../../lib/toast'
import { IconCheck, IconClose, IconInfo } from './Icons'

function ToastIcon({ type }: { type: string }) {
  if (type === 'success') return <IconCheck size={14} strokeWidth={2.5} />
  if (type === 'error')   return <IconClose size={14} strokeWidth={2.5} />
  return <IconInfo size={14} strokeWidth={2} />
}

export default function Toaster() {
  const items = useToastItems()
  if (items.length === 0) return null
  return (
    <div className="toaster" role="status" aria-live="polite">
      {items.map(item => (
        <div key={item.id} className={`toast show toast-${item.type}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ToastIcon type={item.type} />
          {item.message}
        </div>
      ))}
    </div>
  )
}
