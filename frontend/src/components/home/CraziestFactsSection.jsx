import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { fetchWikiFactsNextBatch } from '../../hooks/useWikiFacts'
import { useFactVotes } from '../../hooks/useFactVotes'
import { useVoteFact } from '../../hooks/useVoteFact'
import { useUserProgress } from '../../hooks/useUserProgress'
import { navigateToRandomWikiArticle } from '../../lib/navigateToRandomWikiArticle'
import FactCard from './FactCard'
import FactsLeaderboard from './FactsLeaderboard'

export default function CraziestFactsSection() {
  const navigate = useNavigate()
  const { userId, user, profile } = useUserProgress()
  const factVotesQuery = useFactVotes({ userId })
  const voteMutation = useVoteFact({ userId, user })

  const votesRef = useRef([])
  votesRef.current = factVotesQuery.data?.ids ?? []
  const voteMap = factVotesQuery.data?.voteMap ?? new Map()

  const queueRef = useRef([])
  const hadQueueRef = useRef(false)

  const [sort, setSort] = useState('popular')
  const [showSeen, setShowSeen] = useState(false)
  const [queue, setQueue] = useState([])
  const [sessionSeen, setSessionSeen] = useState(() => new Set())
  const scanRef = useRef(0)
  const [exhausted, setExhausted] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [tableIsEmpty, setTableIsEmpty] = useState(false)

  const [voteError, setVoteError] = useState(null)
  const [randomArticleLoading, setRandomArticleLoading] = useState(false)
  const [randomArticleError, setRandomArticleError] = useState(null)
  const [cardVisible, setCardVisible] = useState(true)

  useEffect(() => {
    if (queue.length > 0) hadQueueRef.current = true
  }, [queue.length])

  queueRef.current = queue

  const advanceCard = useCallback(() => {
    setVoteError(null)
    setCardVisible(false)
    setTimeout(() => {
      setQueue((q) => {
        const head = q[0]
        if (head) {
          setSessionSeen((prev) => new Set(prev).add(head.id))
        }
        return q.slice(1)
      })
      setCardVisible(true)
    }, 150)
  }, [])

  const resetQueue = useCallback(() => {
    setVoteError(null)
    setSessionSeen(new Set())
    scanRef.current = 0
    setQueue([])
    setExhausted(false)
    hadQueueRef.current = false
    setLoadError(null)
    setTableIsEmpty(false)
    setLoadingInitial(true)
  }, [])

  const changeSort = useCallback(
    (next) => {
      if (next === sort) return
      setSort(next)
      resetQueue()
    },
    [sort, resetQueue],
  )

  const toggleShowSeen = useCallback(() => {
    setShowSeen((prev) => !prev)
    resetQueue()
  }, [resetQueue])

  useEffect(() => {
    if (userId && factVotesQuery.isLoading) return

    let cancelled = false

    void (async () => {
      try {
        const exclude = showSeen ? new Set() : new Set(votesRef.current)
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
  }, [sort, showSeen, userId, factVotesQuery.isLoading])

  const prefetch = useCallback(async () => {
    if (loadingMore || loadingInitial) return
    if (exhausted) return

    setLoadingMore(true)
    try {
      const exclude = showSeen ? new Set() : new Set(votesRef.current)
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
  }, [exhausted, loadingInitial, loadingMore, sessionSeen, showSeen, sort])

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
        advanceCard()
        return
      }

      if (!userId) {
        advanceCard()
        return
      }

      setVoteError(null)
      try {
        await voteMutation.mutateAsync({
          factId: current.id,
          vote: type === 'up' ? 'up' : 'down',
        })
        advanceCard()
      } catch (err) {
        setVoteError(
          err instanceof Error ? err.message : 'Could not save vote',
        )
      }
    },
    [advanceCard, userId, voteMutation],
  )

  const current = queue[0]
  const buttonsLocked = voteMutation.isPending

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
    <section className="min-w-0 flex-1 bg-white">
      <header className="flex flex-col gap-3 bg-primary px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="shrink-0 text-white" aria-hidden>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="block"
            >
              <path
                d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9 18h6M10 22h4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h2 className="text-lg font-semibold leading-tight tracking-tight text-white">
            SHARED FACTS
          </h2>
          <div className="group relative ml-1 flex shrink-0 items-center">
            <button
              type="button"
              aria-label="About Shared Facts"
              className="flex h-[1.2rem] w-[1.2rem] shrink-0 items-center justify-center rounded-full border border-white/50 text-[11px] font-bold leading-none text-white/70 hover:border-white hover:text-white"
            >
              ?
            </button>
            <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-none border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600 opacity-0 shadow-lg ring-1 ring-slate-900/5 transition-opacity group-hover:opacity-100">
              <p className="font-semibold text-slate-800">What are Shared Facts?</p>
              <p className="mt-1">Facts submitted by the WikiDaily community from Wikipedia articles. Vote on each one to help surface the most interesting ones.</p>
              <p className="mt-2 font-semibold text-slate-800">How to share a fact</p>
              <p className="mt-1">Open any Wikipedia article on WikiDaily, highlight the text you want to share, then click <span className="font-medium text-primary">Share Fact</span>.</p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2">
            <span className="text-xs font-medium text-white/85">Show seen</span>
            <button
              type="button"
              role="switch"
              aria-checked={showSeen}
              onClick={toggleShowSeen}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
                showSeen ? 'bg-green-400' : 'bg-white/30'
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 bg-white shadow transition-transform duration-200 ${
                  showSeen ? 'translate-x-0' : 'translate-x-[-14.5px]'
                }`}
              />
            </button>
          </label>
          <div className="flex shrink-0 rounded-none border border-white/35 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => changeSort('popular')}
            className={
              sort === 'popular'
                ? 'bg-white px-3 py-1.5 font-medium text-primary'
                : 'px-3 py-1.5 font-medium text-white/95 hover:bg-white/10'
            }
          >
            Most Popular
          </button>
          <button
            type="button"
            onClick={() => changeSort('newest')}
            className={
              sort === 'newest'
                ? 'bg-white px-3 py-1.5 font-medium text-primary'
                : 'px-3 py-1.5 font-medium text-white/95 hover:bg-white/10'
            }
          >
            Newest
          </button>
        </div>
        </div>
      </header>

      <div className="space-y-3 px-4 pt-4 pb-0 md:px-6">
      {loadError ? (
        <div className="rounded-none border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {loadError}
        </div>
      ) : null}

      {loadingInitial ? (
        <div className="flex min-h-[240px] w-full min-w-0 flex-col animate-pulse border border-slate-200 bg-slate-50 p-4">
          <div className="min-h-0 flex-1 space-y-2">
            <div className="h-5 w-full rounded bg-slate-200" />
            <div className="h-5 w-full rounded bg-slate-200" />
            <div className="h-5 w-4/5 rounded bg-slate-200" />
          </div>
          <div className="mt-2 h-px shrink-0 bg-slate-200" />
          <div className="mt-2 flex shrink-0 items-start gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="h-10 w-10 shrink-0 rounded-full bg-slate-200" />
              <div className="space-y-2 pt-1">
                <div className="h-3 w-24 rounded bg-slate-200" />
                <div className="h-3 w-32 rounded bg-slate-200" />
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2 pt-1">
              <div className="ml-auto h-4 w-28 rounded bg-slate-200" />
            </div>
          </div>
        </div>
      ) : null}

      {showEmptyDb ? (
        <div className="mx-auto max-w-xl space-y-3 py-4 text-center">
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
        <div className="mx-auto max-w-xl space-y-3 py-4 text-center">
          <p className="text-sm text-slate-700">
            You&apos;ve seen all the facts! Read more articles and submit your
            own discoveries.
          </p>
          <FactsLeaderboard limit={3} />
          <button
            type="button"
            onClick={() => void handleReadRandomArticle()}
            disabled={randomArticleLoading}
            className="inline-flex rounded-none bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
          >
            {randomArticleLoading ? 'Picking a random article…' : 'Read a random article'}
          </button>
          {randomArticleError ? (
            <p className="text-sm text-rose-700">{randomArticleError}</p>
          ) : null}
        </div>
      ) : null}

      {!loadingInitial && !loadError && current ? (
        <div
          className="transition-opacity duration-150"
          style={{ opacity: cardVisible ? 1 : 0 }}
        >
          <FactCard
            fact={current}
            onVote={handleVote}
            buttonsLocked={buttonsLocked}
            voteError={voteError}
            userId={userId}
            user={user}
            profile={profile}
            existingVote={voteMap.get(current?.id) ?? null}
          />
        </div>
      ) : null}

      {!loadingInitial &&
      !loadError &&
      !current &&
      loadingMore &&
      hadQueueRef.current ? (
        <div className="min-h-[120px] w-full min-w-0 animate-pulse border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
          Loading more facts…
        </div>
      ) : null}
      </div>
    </section>
  )
}
