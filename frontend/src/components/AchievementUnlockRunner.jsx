import { useEffect, useMemo, useRef } from 'react'

import { useUserProgress } from '../hooks/useUserProgress'
import { useAchievements } from '../hooks/useAchievements'
import { getNewlyUnlocked } from '../lib/achievementChecker'

export default function AchievementUnlockRunner() {
  const { userId, profile } = useUserProgress()
  const { achievements, unlocked, insertUnlock } = useAchievements({ userId })

  const profileSnapshot = useMemo(() => {
    if (!profile) return null
    return {
      total_read: profile.total_read ?? 0,
      total_random_read: profile.total_random_read ?? 0,
      current_streak: profile.current_streak ?? 0,
    }
  }, [profile?.total_read, profile?.total_random_read, profile?.current_streak])

  const fingerprint = useMemo(() => {
    if (!userId || !profileSnapshot) return null
    return `${userId}:${profileSnapshot.total_read}:${profileSnapshot.total_random_read}:${profileSnapshot.current_streak}`
  }, [userId, profileSnapshot])

  // Primitive keys so the effect can re-run when definitions/unlocks arrive,
  // without depending on unstable object identities.
  const achievementsKey = Array.isArray(achievements) ? achievements.length : 0
  const unlockedKey = unlocked instanceof Set ? unlocked.size : 0

  const lastCheckedRef = useRef(null)

  useEffect(() => {
    if (!fingerprint) return
    if (!Array.isArray(achievements) || achievements.length === 0) return
    if (!profileSnapshot) return
    if (fingerprint === lastCheckedRef.current) return
    lastCheckedRef.current = fingerprint

    const newlyUnlocked = getNewlyUnlocked(profileSnapshot, achievements, unlocked)
    if (newlyUnlocked.length === 0) return

    let cancelled = false

    ;(async () => {
      for (const a of newlyUnlocked) {
        if (cancelled) return
        try {
          await insertUnlock(a.id)
        } catch {
          // Best-effort: ignore insert failures so reads never break.
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [fingerprint, achievementsKey, unlockedKey, achievements, unlocked, insertUnlock, profileSnapshot])

  return null
}

