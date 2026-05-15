import { useToastItems, dismissToast } from '../../lib/toast'
import { motion, AnimatePresence } from 'framer-motion'
import { IconCheck, IconClose } from './Icons'

export default function Toaster() {
  const items = useToastItems()
  
  return (
    <div className="toaster" role="status" aria-live="polite">
      <AnimatePresence>
        {items.map(item => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.4}
            onDragEnd={(_, info) => {
              if (info.offset.y > 20 || info.offset.y < -20) {
                dismissToast(item.id)
              }
            }}
            className={`toast toast-${item.type}`}
          >
            <span className="toast-icon">
              {item.type === 'success' ? <IconCheck size={16} strokeWidth={3} /> : 
               item.type === 'error' ? <IconClose size={16} strokeWidth={3} /> : 'ℹ'}
            </span>
            <span className="toast-message">{item.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
