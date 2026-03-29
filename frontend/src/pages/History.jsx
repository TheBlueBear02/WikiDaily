import { useDailyArchive } from '../hooks/useDailyArchive'
import { useUserProgress } from '../hooks/useUserProgress'
import { useReadingLog } from '../hooks/useReadingLog'
import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

function ymdUtcFromParts(year, monthIndex0, day) {
  const m = String(monthIndex0 + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

function daysInUtcMonth(year, monthIndex0) {
  // day 0 of next month is the last day of current month
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate()
}

function utcWeekdayIndexMon0(year, monthIndex0, day) {
  // JS: 0=Sun..6=Sat -> convert to 0=Mon..6=Sun
  const js = new Date(Date.UTC(year, monthIndex0, day)).getUTCDay()
  return (js + 6) % 7
}

function monthTitle(year, monthIndex0) {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(
    new Date(Date.UTC(year, monthIndex0, 1)),
  )
}

function monthParamFromParts(year, monthIndex0) {
  const m = String(monthIndex0 + 1).padStart(2, '0')
  return `${year}-${m}`
}

function monthPartsFromParam(param) {
  if (typeof param !== 'string') return null
  const match = /^(\d{4})-(\d{2})$/.exec(param.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (!Number.isFinite(year) || year < 1970 || year > 2100) return null
  if (!Number.isFinite(month) || month < 1 || month > 12) return null
  return { year, monthIndex0: month - 1 }
}

function DayCard({ dayNumber, row, wikiUrl, isCollected, isToday }) {
  const isEmpty = !row
  return (
    <div
      className={[
        'relative overflow-hidden rounded-xl border',
        isToday ? 'ring-2 ring-indigo-300 ring-offset-2 ring-offset-slate-50' : null,
        isEmpty
          ? 'border-slate-200 bg-white/60'
          : isCollected
            ? 'border-emerald-300 bg-white shadow-sm ring-1 ring-emerald-100'
            : 'border-slate-200 bg-white shadow-sm',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="text-sm font-semibold tabular-nums text-slate-900">{dayNumber}</div>
        {isCollected ? (
          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
            Read
          </div>
        ) : null}
      </div>

      {isToday ? (
        <div className="pointer-events-none absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-indigo-500" />
      ) : null}

      {row ? (
        <a
          href={wikiUrl}
          target="_blank"
          rel="noreferrer"
          className="block focus:outline-none"
          aria-label={`Open article: ${row.display_title}`}
        >
          {row.image_url ? (
            <div className="mx-3 overflow-hidden rounded-lg bg-slate-100">
              <div className="aspect-[16/10] w-full">
                <img
                  src={row.image_url}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          ) : (
            <div className="mx-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-medium text-slate-600">No image</div>
            </div>
          )}

          <div className="p-3 pt-3">
            <div className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
              {row.display_title}
            </div>
            <div className="mt-1 text-xs text-slate-500">{row.date}</div>
          </div>
        </a>
      ) : (
        <div className="px-3 pb-4">
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-3">
            <div className="text-xs font-medium text-slate-500">No article yet</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function History() {
  const [searchParams, setSearchParams] = useSearchParams()
  const now = new Date()
  const currentYear = now.getUTCFullYear()
  const currentMonthIndex0 = now.getUTCMonth()
  const currentDayNumber = now.getUTCDate()

  const selected = useMemo(() => {
    const parsed = monthPartsFromParam(searchParams.get('month'))
    if (parsed) return parsed
    return { year: currentYear, monthIndex0: currentMonthIndex0 }
  }, [currentMonthIndex0, currentYear, searchParams])

  useEffect(() => {
    if (monthPartsFromParam(searchParams.get('month'))) return
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('month', monthParamFromParts(currentYear, currentMonthIndex0))
      return next
    })
  }, [currentMonthIndex0, currentYear, searchParams, setSearchParams])

  const year = selected.year
  const monthIndex0 = selected.monthIndex0
  const from = ymdUtcFromParts(year, monthIndex0, 1)
  const to = ymdUtcFromParts(year, monthIndex0, daysInUtcMonth(year, monthIndex0))

  const { data, isLoading, isError, error, refetch } = useDailyArchive({ from, to })
  const { userId } = useUserProgress()
  const readingLogQuery = useReadingLog({ userId })

  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-4/6 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      </section>
    )
  }

  if (isError) {
    return (
      <section className="space-y-4">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">
          <div className="text-sm font-medium text-rose-900">
            Couldn’t load the archive
          </div>
          <div className="mt-1 text-sm text-rose-800">
            {error?.message ?? 'Unknown error'}
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        </div>
      </section>
    )
  }

  const rows = data ?? []
  const rowsByDay = new Map(rows.map((r) => [Number(String(r.date).slice(-2)), r]))
  const collectedDates = new Set(
    (readingLogQuery.data ?? []).map((r) => r.read_date).filter(Boolean),
  )

  const totalDays = daysInUtcMonth(year, monthIndex0)
  const firstOffset = utcWeekdayIndexMon0(year, monthIndex0, 1)
  const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <section className="space-y-4">
      {rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="text-sm font-medium text-slate-900">No articles for this month yet</div>
          <div className="mt-1 text-sm text-slate-600">
            You’ll still see the full calendar—days will fill in as the daily picker writes
            rows to Supabase.
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-slate-500">Month</div>
            <div className="text-xl font-semibold tracking-tight">
              {monthTitle(year, monthIndex0)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const d = new Date(Date.UTC(year, monthIndex0, 1))
                d.setUTCMonth(d.getUTCMonth() - 1)
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev)
                  next.set('month', monthParamFromParts(d.getUTCFullYear(), d.getUTCMonth()))
                  return next
                })
              }}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => {
                const d = new Date(Date.UTC(year, monthIndex0, 1))
                d.setUTCMonth(d.getUTCMonth() + 1)
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev)
                  next.set('month', monthParamFromParts(d.getUTCFullYear(), d.getUTCMonth()))
                  return next
                })
              }}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekdayLabels.map((label) => (
            <div
              key={label}
              className="px-1 pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-7">
          {Array.from({ length: firstOffset }).map((_, idx) => (
            <div key={`pad-${idx}`} className="hidden sm:block" />
          ))}

          {Array.from({ length: totalDays }).map((_, idx) => {
            const dayNumber = idx + 1
            const row = rowsByDay.get(dayNumber) ?? null
            const wikiUrl = row
              ? `https://en.wikipedia.org/wiki/${encodeURIComponent(row.wiki_slug)}`
              : null
            const isCollected = Boolean(userId) && Boolean(row) && collectedDates.has(row.date)
            const isToday =
              year === currentYear &&
              monthIndex0 === currentMonthIndex0 &&
              dayNumber === currentDayNumber

            return (
              <DayCard
                key={`${year}-${monthIndex0}-${dayNumber}`}
                dayNumber={dayNumber}
                row={row}
                wikiUrl={wikiUrl}
                isCollected={isCollected}
                isToday={isToday}
              />
            )
          })}
        </div>
      </div>
    </section>
  )
}

