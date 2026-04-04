import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useSoftDeleteMyFact } from '../../hooks/useSoftDeleteMyFact'
import SubmittedFactCard from '../shared/SubmittedFactCard'

const PAGE_SIZE = 6

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-none border border-slate-200 bg-white">
      <div className="h-[100px] w-full animate-pulse bg-slate-200" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  )
}

export default function MyFactsGrid({
  userId,
  entries,
  isLoading,
  isError,
  error,
  onRetry,
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [deletingId, setDeletingId] = useState(null)
  const [deleteError, setDeleteError] = useState(null)
  const softDeleteMutation = useSoftDeleteMyFact({ userId })

  function sameFactId(a, b) {
    return String(a ?? '') === String(b ?? '')
  }

  async function handleDeleteFact(factId) {
    if (factId == null || softDeleteMutation.isPending) return
    setDeleteError(null)
    setDeletingId(factId)
    try {
      await softDeleteMutation.mutateAsync({ factId })
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : err && typeof err.message === 'string' && err.message.trim()
            ? err.message.trim()
            : 'Could not delete this fact. Please try again.'
      setDeleteError(message)
    } finally {
      setDeletingId(null)
    }
  }
  const count = Array.isArray(entries) ? entries.length : 0
  const visibleEntries = Array.isArray(entries) ? entries.slice(0, visibleCount) : []
  const hasMore = count > visibleCount

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-lg font-semibold tracking-tight text-primary">Your crazy facts</div>
        <div className="text-sm text-slate-500">{count} fact{count === 1 ? '' : 's'}</div>
      </div>

      {deleteError ? (
        <div className="rounded-none border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {deleteError}
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <SkeletonCard key={`s-${idx}`} />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">
          <div className="text-sm font-medium text-rose-900">Could not load your facts.</div>
          <div className="mt-1 text-sm text-rose-800">{error?.message ?? 'Unknown error'}</div>
          <div className="mt-4">
            <button
              type="button"
              onClick={onRetry}
              className="bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        </div>
      ) : count === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
          <div className="text-sm font-medium text-primary">No facts submitted yet.</div>
          <div className="mt-1 text-sm text-slate-600">
            Highlight text in an article and submit it as a crazy fact.
          </div>
          <div className="mt-4">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-none bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              Read an article
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleEntries.map((entry) => (
              <SubmittedFactCard
                key={entry?.id ?? entry?.wiki_slug}
                entry={entry}
                onDelete={
                  userId && entry?.id != null
                    ? () => {
                        void handleDeleteFact(entry.id)
                      }
                    : undefined
                }
                isDeleting={sameFactId(deletingId, entry?.id)}
                deleteLocked={
                  softDeleteMutation.isPending && !sameFactId(deletingId, entry?.id)
                }
              />
            ))}
          </div>
          {hasMore ? (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="rounded-none border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-slate-50"
              >
                Show more
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
