import { useEffect, useMemo, useState } from 'react'

const WEEKS_FULL_YEAR = 52
const WEEKS_LAST_THREE_MONTHS = 13

function useNarrowActivityHeatmap() {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setNarrow(mq.matches)
    const handler = () => setNarrow(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return narrow
}

const EMPTY_CELL =
  'h-3 w-3 rounded-[2px] bg-slate-200/60'
const FILLED_CELL =
  'h-3 w-3 rounded-[2px] bg-emerald-500'
const FUTURE_CELL =
  'h-3 w-3 rounded-[2px] bg-slate-200/40 opacity-40'

function ymdUtc(date) {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseYmdAsUtcDate(ymd) {
  if (typeof ymd !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
  if (!match) return null
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
  return new Date(Date.UTC(y, m - 1, d))
}

function mondayOfWeekUtc(date) {
  // JS: 0=Sun..6=Sat -> convert to 0=Mon..6=Sun
  const monIndex0 = (date.getUTCDay() + 6) % 7
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  d.setUTCDate(d.getUTCDate() - monIndex0)
  return d
}

function addDaysUtc(date, days) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

function buildHeatmapGrid(numWeeks) {
  const today = new Date()
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  const endMonday = mondayOfWeekUtc(todayUtc)
  const start = addDaysUtc(endMonday, -7 * (numWeeks - 1))

  const labels = []
  const seenMonths = new Set()
  let monthCount = 0
  const showEveryMonth = numWeeks < WEEKS_FULL_YEAR

  for (let col = 0; col < numWeeks; col += 1) {
    for (let row = 0; row < 7; row += 1) {
      const d = addDaysUtc(start, col * 7 + row)
      if (d.getUTCDate() === 1) {
        const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`
        if (!seenMonths.has(key)) {
          seenMonths.add(key)
          if (showEveryMonth || monthCount % 2 === 0) {
            labels.push({
              col,
              text: new Intl.DateTimeFormat(undefined, { month: 'short', timeZone: 'UTC' }).format(d),
            })
          }
          monthCount += 1
        }
        break
      }
    }
  }

  const grid = []
  for (let col = 0; col < numWeeks; col += 1) {
    for (let rowMon0 = 0; rowMon0 < 7; rowMon0 += 1) {
      const dateUtc = addDaysUtc(start, col * 7 + rowMon0)
      grid.push({ col, rowMon0, dateUtc, ymd: ymdUtc(dateUtc) })
    }
  }

  return { todayUtcDate: todayUtc, cells: grid, monthLabels: labels, numWeeks }
}

function formatTooltip(dateUtc, title) {
  const dayLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dateUtc)
  if (title) return `${dayLabel} — ${title}`
  return dayLabel
}

function buildReadIndex(entries) {
  const byDate = new Map()
  const readSet = new Set()

  for (const e of entries ?? []) {
    const ymd = typeof e?.read_date === 'string' ? e.read_date : null
    if (!ymd) continue
    readSet.add(ymd)

    const title =
      typeof e?.articles?.display_title === 'string' && e.articles.display_title.trim()
        ? e.articles.display_title.trim()
        : null
    if (title && !byDate.has(ymd)) byDate.set(ymd, title)
  }

  return { readSet, titleByDate: byDate }
}

export default function ActivityHeatmap({ entries }) {
  const narrow = useNarrowActivityHeatmap()
  const numWeeks = narrow ? WEEKS_LAST_THREE_MONTHS : WEEKS_FULL_YEAR

  const { todayUtcDate, cells, monthLabels, numWeeks: columnCount } = useMemo(
    () => buildHeatmapGrid(numWeeks),
    [numWeeks]
  )

  const { readSet, titleByDate } = useMemo(() => buildReadIndex(entries), [entries])
  const todayYmd = useMemo(() => ymdUtc(todayUtcDate), [todayUtcDate])

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="space-y-2">
      <div className="ml-8 flex gap-[3px] text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {Array.from({ length: columnCount }).map((_, col) => {
          const label = monthLabels.find((l) => l.col === col)
          return (
            <div key={`m-${col}`} className="w-3">
              {label ? label.text : null}
            </div>
          )
        })}
      </div>

      <div className="flex items-start gap-2">
        <div className="flex w-6 flex-col gap-[3px] pt-[1px] text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {dayLabels.map((d) => (
            <div key={d} className="h-3 leading-3">
              {d === 'Tue' || d === 'Thu' || d === 'Sat' ? d : null}
            </div>
          ))}
        </div>

        <div className="grid grid-flow-col grid-rows-7 gap-[3px]">
          {cells.map((cell) => {
            const isFuture = cell.ymd > todayYmd
            const isRead = readSet.has(cell.ymd)

            const title = isFuture
              ? undefined
              : formatTooltip(cell.dateUtc, titleByDate.get(cell.ymd) ?? null)

            const className = isFuture
              ? FUTURE_CELL
              : isRead
                ? FILLED_CELL
                : EMPTY_CELL

            return (
              <div
                key={`${cell.col}-${cell.rowMon0}`}
                className={className}
                title={title}
                aria-label={title}
              />
            )
          })}
        </div>
      </div>

    </div>
  )
}

