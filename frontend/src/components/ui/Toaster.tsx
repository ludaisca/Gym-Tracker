import { useToastItems } from '../../lib/toast'

export default function Toaster() {
  const items = useToastItems()
  if (items.length === 0) return null
  return (
    <div className="toaster" role="status" aria-live="polite">
      {items.map(item => (
        <div key={item.id} className={`toast show toast-${item.type}`}>
          {item.type === 'success' ? '✓ ' : item.type === 'error' ? '✕ ' : 'ℹ '}
          {item.message}
        </div>
      ))}
    </div>
  )
}
