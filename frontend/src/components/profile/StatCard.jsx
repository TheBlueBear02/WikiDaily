export default function StatCard({ label, value, valueSuffix = null, helper = null }) {
  return (
    <div className="rounded-none bg-slate-50 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-3xl font-medium leading-none text-primary">{value}</div>
        {valueSuffix ? (
          <div className="text-sm font-medium text-slate-500">{valueSuffix}</div>
        ) : null}
        {helper ? <div className="text-sm text-slate-500">{helper}</div> : null}
      </div>
    </div>
  )
}

