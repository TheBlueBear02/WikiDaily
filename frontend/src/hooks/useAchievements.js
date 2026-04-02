import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getSupabase } from '../lib/supabaseClient'

export function useAchievements({ userId } = {}) {
  const queryClient = useQueryClient()

  const achievementsQuery = useQuery({
    queryKey: ['achievements'],
    staleTime: Infinity,
    queryFn: async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('achievements')
        .select('id, type, threshold, label, description, icon')
        .order('type')
        .order('threshold', { ascending: true })

      if (error) throw error
      return data ?? []
    },
  })

  const userAchievementsQuery = useQuery({
    queryKey: ['userAchievements', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at, notified')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
  })

  const achievements = achievementsQuery.data ?? []
  const userAchievements = userAchievementsQuery.data ?? []

  const unlocked = useMemo(() => {
    return new Set(userAchievements.map((a) => a.achievement_id))
  }, [userAchievements])

  const pending = useMemo(() => {
    return userAchievements.filter((a) => !a.notified)
  }, [userAchievements])

  const insertUnlockMutation = useMutation({
    mutationFn: async ({ achievementId } = {}) => {
      if (!userId) throw new Error('Missing userId.')
      if (typeof achievementId !== 'number') throw new Error('Missing achievementId.')

      const supabase = getSupabase()
      const { error } = await supabase.from('user_achievements').insert(
        { user_id: userId, achievement_id: achievementId, notified: false },
        { onConflict: 'user_id,achievement_id', ignoreDuplicates: true },
      )

      if (error) throw error
      return { status: 'ok' }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['userAchievements', userId] })
    },
  })

  const markNotifiedMutation = useMutation({
    mutationFn: async ({ achievementId } = {}) => {
      if (!userId) throw new Error('Missing userId.')
      if (typeof achievementId !== 'number') throw new Error('Missing achievementId.')

      const supabase = getSupabase()
      const { error } = await supabase
        .from('user_achievements')
        .update({ notified: true })
        .eq('user_id', userId)
        .eq('achievement_id', achievementId)

      if (error) throw error
      return { status: 'ok' }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['userAchievements', userId] })
    },
  })

  const isLoading = achievementsQuery.isLoading || userAchievementsQuery.isLoading

  return {
    achievements,
    unlocked,
    pending,
    insertUnlock: async (achievementId) => {
      return await insertUnlockMutation.mutateAsync({ achievementId })
    },
    markNotified: async (achievementId) => {
      return await markNotifiedMutation.mutateAsync({ achievementId })
    },
    isLoading,
    achievementsQuery,
    userAchievementsQuery,
    insertUnlockMutation,
    markNotifiedMutation,
  }
}

