import { useEffect, useState } from 'react'

import { getLeaderboardCountdownParts } from '../lib/date'

const TICK_MS = 1000

export function useLeaderboardCountdown() {
  const [parts, setParts] = useState(() => getLeaderboardCountdownParts())

  useEffect(() => {
    const tick = () => setParts(getLeaderboardCountdownParts())
    tick()
    const id = window.setInterval(tick, TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  return parts
}
