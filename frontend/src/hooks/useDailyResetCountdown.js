import { useEffect, useState } from 'react'

import { getDailyCountdownParts } from '../lib/date'

const TICK_MS = 1000

export function useDailyResetCountdown() {
  const [parts, setParts] = useState(() => getDailyCountdownParts())

  useEffect(() => {
    const tick = () => setParts(getDailyCountdownParts())
    tick()
    const id = window.setInterval(tick, TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  return parts
}

