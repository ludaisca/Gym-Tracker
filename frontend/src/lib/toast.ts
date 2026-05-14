import { useState, useEffect } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
}

let _listeners: ((items: ToastItem[]) => void)[] = []
let _items: ToastItem[] = []

function publish() {
  const snapshot = [..._items]
  _listeners.forEach(l => l(snapshot))
}

export function toast(message: string, type: ToastType = 'success', duration = 3000) {
  const id = Math.random().toString(36).slice(2)
  _items = [..._items, { id, message, type }]
  publish()
  setTimeout(() => {
    _items = _items.filter(t => t.id !== id)
    publish()
  }, duration)
}

export function useToastItems(): ToastItem[] {
  const [items, setItems] = useState<ToastItem[]>(_items)
  useEffect(() => {
    _listeners.push(setItems)
    return () => { _listeners = _listeners.filter(l => l !== setItems) }
  }, [])
  return items
}
