import { useState, useEffect } from 'react'
import { routinesApi } from '../api/routines'
import type { Routine } from '../types/domain'

export function useRoutines(): Routine[] {
  const [customRoutines, setCustomRoutines] = useState<Routine[]>([])

  useEffect(() => {
    routinesApi.list().then(setCustomRoutines).catch((err: unknown) => console.warn("[hook]", err))
  }, [])

  return customRoutines
}
