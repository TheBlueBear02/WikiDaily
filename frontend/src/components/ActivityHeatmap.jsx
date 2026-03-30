import { useMemo } from 'react'

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
  const { startMonday, todayUtcDate, cells, monthLabels } = useMemo(() => {
    const today = new Date()
    const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    const endMonday = mondayOfWeekUtc(todayUtc)
    const start = addDaysUtc(endMonday, -7 * 51) // 52 full weeks

    const labels = []
    for (let col = 0; col < 52; col += 1) {
      const colStart = addDaysUtc(start, col * 7)
      if (colStart.getUTCDate() === 1) {
        labels.push({
          col,
          text: new Intl.DateTimeFormat(undefined, { month: 'short', timeZone: 'UTC' }).format(
            colStart,
          ),
        })
      }
    }

    const grid = []
    for (let col = 0; col < 52; col += 1) {
      for (let rowMon0 = 0; rowMon0 < 7; rowMon0 += 1) {
        const dateUtc = addDaysUtc(start, col * 7 + rowMon0)
        grid.push({ col, rowMon0, dateUtc, ymd: ymdUtc(dateUtc) })
      }
    }

    return { startMonday: start, todayUtcDate: todayUtc, cells: grid, monthLabels: labels }
  }, [])

  const { readSet, titleByDate } = useMemo(() => buildReadIndex(entries), [entries])
  const todayYmd = useMemo(() => ymdUtc(todayUtcDate), [todayUtcDate])

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="space-y-2">
      <div className="ml-8 flex gap-[3px] text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {Array.from({ length: 52 }).map((_, col) => {
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
              {d === 'Mon' || d === 'Wed' || d === 'Fri' ? d : null}
            </div>
          ))}
        </div>

        <div className="grid grid-flow-col grid-rows-7 gap-[3px]">
          {cells.map((cell) => {
            const isFuture = cell.ymd > todayYmd
            const isToday = cell.ymd === todayYmd
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
                className={[
                  className,
                  isToday ? 'ring-1 ring-slate-600 ring-offset-1 ring-offset-white' : null,
                ]
                  .filter(Boolean)
                  .join(' ')}
                title={title}
                aria-label={title}
              />
            )
          })}
        </div>
      </div>

      <div className="text-xs text-slate-500">
        Tip: the activity tooltip uses the browser’s native hover behavior (it may not appear on
        touch devices).
      </div>
    </div>
  )
}

