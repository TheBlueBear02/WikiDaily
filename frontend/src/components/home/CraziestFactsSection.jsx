import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { fetchWikiFactsNextBatch } from '../../hooks/useWikiFacts'
import { useFactVotes } from '../../hooks/useFactVotes'
import { useVoteFact } from '../../hooks/useVoteFact'
import { useSoftDeleteMyFact } from '../../hooks/useSoftDeleteMyFact'
import { useUserProgress } from '../../hooks/useUserProgress'
import { navigateToRandomWikiArticle } from '../../lib/navigateToRandomWikiArticle'
import FactCard from './FactCard'

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const fn = () => setReduced(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return reduced
}

export default function CraziestFactsSection() {
  const navigate = useNavigate()
  const prefersReducedMotion = usePrefersReducedMotion()
  const { userId, user, profile } = useUserProgress()
  const factVotesQuery = useFactVotes({ userId })
  const voteMutation = useVoteFact({ userId, user })
  const softDeleteMutation = useSoftDeleteMyFact({ userId })

  const votesRef = useRef([])
  votesRef.current = factVotesQuery.data ?? []

  const queueRef = useRef([])
  const hadQueueRef = useRef(false)

  const [sort, setSort] = useState('popular')
  const [queue, setQueue] = useState([])
  const [sessionSeen, setSessionSeen] = useState(() => new Set())
  const scanRef = useRef(0)
  const [exhausted, setExhausted] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [tableIsEmpty, setTableIsEmpty] = useState(false)

  const [phase, setPhase] = useState('idle')
  const [showScore, setShowScore] = useState(false)
  const [voteError, setVoteError] = useState(null)
  const [randomArticleLoading, setRandomArticleLoading] = useState(false)
  const [randomArticleError, setRandomArticleError] = useState(null)

  const timersRef = useRef([])
  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }, [])

  useEffect(() => () => clearTimers(), [clearTimers])

  useEffect(() => {
    if (queue.length > 0) hadQueueRef.current = true
  }, [queue.length])

  queueRef.current = queue

  const flipMs = prefersReducedMotion ? 300 : 600

  const advanceCard = useCallback(() => {
    clearTimers()
    setPhase('idle')
    setShowScore(false)
    setVoteError(null)
    setQueue((q) => {
      const head = q[0]
      if (head) {
        setSessionSeen((prev) => new Set(prev).add(head.id))
      }
      return q.slice(1)
    })
  }, [clearTimers])

  const changeSort = useCallback(
    (next) => {
      if (next === sort) return
      clearTimers()
      setSort(next)
      setPhase('idle')
      setShowScore(false)
      setVoteError(null)
      setSessionSeen(new Set())
      scanRef.current = 0
      setQueue([])
      setExhausted(false)
      hadQueueRef.current = false
      setLoadError(null)
      setTableIsEmpty(false)
      setLoadingInitial(true)
    },
    [clearTimers, sort],
  )

  useEffect(() => {
    if (userId && factVotesQuery.isLoading) return

    let cancelled = false
    clearTimers()

    void (async () => {
      try {
        const exclude = new Set(votesRef.current)
        const { facts, nextScanFrom, exhausted: ex, tableEmpty } =
          await fetchWikiFactsNextBatch({
            sort,
            excludeIds: exclude,
            scanFrom: 0,
          })
        if (cancelled) return
        scanRef.current = nextScanFrom
        setQueue(facts)
        setExhausted(ex)
        setTableIsEmpty(Boolean(tableEmpty))
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'Failed to load facts',
          )
          // Stop prefetch effect from hammering the API (e.g. 400 until migration is applied).
          setExhausted(true)
        }
      } finally {
        if (!cancelled) setLoadingInitial(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [sort, userId, factVotesQuery.isLoading, clearTimers])

  const prefetch = useCallback(async () => {
    if (loadingMore || loadingInitial) return
    if (exhausted) return

    setLoadingMore(true)
    try {
      const exclude = new Set(votesRef.current)
      sessionSeen.forEach((id) => exclude.add(id))
      queueRef.current.forEach((f) => exclude.add(f.id))

      const { facts, nextScanFrom, exhausted: ex } =
        await fetchWikiFactsNextBatch({
          sort,
          excludeIds: exclude,
          scanFrom: scanRef.current,
        })
      scanRef.current = nextScanFrom
      setExhausted(ex)
      if (facts.length > 0) {
        setQueue((q) => [...q, ...facts])
      }
    } catch {
      // Avoid tight retry loops if the table/schema is wrong or the network fails.
      setExhausted(true)
    } finally {
      setLoadingMore(false)
    }
  }, [exhausted, loadingInitial, loadingMore, sessionSeen, sort])

  // Only top up when there are cards left but the buffer is low (never when queue is empty).
  useEffect(() => {
    if (loadingInitial || loadingMore) return
    if (exhausted) return
    if (queue.length === 0) return
    if (queue.length <= 3) {
      void prefetch()
    }
  }, [queue.length, exhausted, loadingInitial, loadingMore, prefetch])

  const handleVote = useCallback(
    async (type) => {
      const current = queueRef.current[0]
      if (!current) return

      if (type === 'skip') {
        setPhase('flipping')
        const t = window.setTimeout(() => advanceCard(), flipMs)
        timersRef.current.push(t)
        return
      }

      setVoteError(null)
      try {
        await voteMutation.mutateAsync({
          factId: current.id,
          vote: type === 'up' ? 'up' : 'down',
        })
        setShowScore(true)
        setPhase('score')
        const t1 = window.setTimeout(() => {
          setPhase('flipping')
          const t2 = window.setTimeout(() => advanceCard(), flipMs)
          timersRef.current.push(t2)
        }, 1500)
        timersRef.current.push(t1)
      } catch (err) {
        setVoteError(
          err instanceof Error ? err.message : 'Could not save vote',
        )
      }
    },
    [advanceCard, flipMs, voteMutation],
  )

  const current = queue[0]
  const buttonsLocked =
    voteMutation.isPending ||
    phase === 'score' ||
    phase === 'flipping' ||
    softDeleteMutation.isPending

  async function handleSoftDelete() {
    if (!current || !userId) return
    if (current.user_id !== userId) return
    try {
      await softDeleteMutation.mutateAsync({ factId: current.id })
      advanceCard()
    } catch {
      // optional toast
    }
  }

  async function handleReadRandomArticle() {
    if (randomArticleLoading) return
    setRandomArticleLoading(true)
    setRandomArticleError(null)
    try {
      await navigateToRandomWikiArticle(navigate)
    } catch (err) {
      setRandomArticleError(
        err instanceof Error ? err.message : 'Failed to load random page',
      )
    } finally {
      setRandomArticleLoading(false)
    }
  }

  const showEmptyDb =
    !loadingInitial &&
    !loadError &&
    queue.length === 0 &&
    exhausted &&
    tableIsEmpty &&
    !loadingMore

  const showSeenAll =
    !loadingInitial &&
    !loadError &&
    queue.length === 0 &&
    exhausted &&
    !tableIsEmpty &&
    !loadingMore

  return (
    <section className="w-full border border-slate-200 bg-white px-4 py-5 md:px-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-serif text-lg font-semibold text-primary">
          Craziest Facts
        </h2>
        <div className="flex rounded-none border border-slate-300 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => changeSort('popular')}
            className={
              sort === 'popular'
                ? 'bg-primary px-3 py-1.5 font-medium text-white'
                : 'px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50'
            }
          >
            Most Popular
          </button>
          <button
            type="button"
            onClick={() => changeSort('newest')}
            className={
              sort === 'newest'
                ? 'bg-primary px-3 py-1.5 font-medium text-white'
                : 'px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50'
            }
          >
            Newest
          </button>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-none border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {loadError}
        </div>
      ) : null}

      {loadingInitial ? (
        <div className="mx-auto min-h-[320px] max-w-xl animate-pulse border border-slate-200 bg-slate-50 p-5">
          <div className="h-6 w-2/3 rounded bg-slate-200" />
          <div className="mt-4 h-px bg-slate-200" />
          <div className="mt-4 space-y-2">
            <div className="h-4 w-full rounded bg-slate-200" />
            <div className="h-4 w-full rounded bg-slate-200" />
            <div className="h-4 w-4/5 rounded bg-slate-200" />
          </div>
        </div>
      ) : null}

      {showEmptyDb ? (
        <div className="mx-auto max-w-xl space-y-3 py-6 text-center">
          <p className="text-sm text-slate-700">
            No facts yet - be the first to share something amazing.
          </p>
          <button
            type="button"
            onClick={() => void handleReadRandomArticle()}
            disabled={randomArticleLoading}
            className="inline-flex rounded-none bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
          >
            {randomArticleLoading ? 'Picking a random article…' : 'Read an article'}
          </button>
          {randomArticleError ? (
            <p className="text-sm text-rose-700">{randomArticleError}</p>
          ) : null}
        </div>
      ) : null}

      {showSeenAll ? (
        <div className="mx-auto max-w-xl space-y-3 py-6 text-center">
          <p className="text-sm text-slate-700">
            You&apos;ve seen all the facts! Read more articles and submit your
            own discoveries.
          </p>
          <button
            type="button"
            onClick={() => void handleReadRandomArticle()}
            disabled={randomArticleLoading}
            className="inline-flex rounded-none bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
          >
            {randomArticleLoading ? 'Picking a random article…' : 'Read an article'}
          </button>
          {randomArticleError ? (
            <p className="text-sm text-rose-700">{randomArticleError}</p>
          ) : null}
        </div>
      ) : null}

      {!loadingInitial && !loadError && current ? (
        <FactCard
          fact={current}
          showScore={showScore}
          onVote={handleVote}
          buttonsLocked={buttonsLocked}
          isFlipping={phase === 'flipping'}
          prefersReducedMotion={prefersReducedMotion}
          voteError={voteError}
          userId={userId}
          user={user}
          profile={profile}
          onSoftDelete={handleSoftDelete}
          isRemoving={softDeleteMutation.isPending}
        />
      ) : null}

      {!loadingInitial &&
      !loadError &&
      !current &&
      loadingMore &&
      hadQueueRef.current ? (
        <div className="mx-auto min-h-[120px] max-w-xl animate-pulse border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
          Loading more facts…
        </div>
      ) : null}
    </section>
  )
}
