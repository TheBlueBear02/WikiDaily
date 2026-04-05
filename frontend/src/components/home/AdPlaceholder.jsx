/**
 * AdPlaceholder — drop-in ad slot for the homepage.
 *
 * Props:
 *   size     – "banner" (728×90) | "rectangle" (300×250) | "leaderboard" (970×90) | "square" (250×250)
 *   label    – override the default "Advertisement" label
 *   className – extra Tailwind classes
 */

const SIZE_CLASSES = {
  banner:      'w-full h-24',        // ~728×90
  leaderboard: 'w-full h-24',        // ~970×90
  rectangle:   'w-[300px] h-[250px]', // 300×250
  square:      'w-[250px] h-[250px]', // 250×250
}

export default function AdPlaceholder({ size = 'banner', label = 'Advertisement', className = '' }) {
  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.banner

  return (
    <div
      className={[
        sizeClass,
        'flex flex-col items-center justify-center gap-1',
        'border border-dashed border-slate-300 bg-slate-50',
        className,
      ].join(' ')}
      aria-label="Ad placeholder"
    >
      <span className="text-[10px] uppercase tracking-widest text-slate-400 select-none">
        {label}
      </span>
      <span className="text-xs text-slate-300 select-none">
        {size} slot
      </span>
    </div>
  )
}
