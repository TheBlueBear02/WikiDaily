/**
 * Card surfaces: static panels use a light (white) fill; clickable cards use a
 * slightly darker slate tint (and emerald when collected). Borders stay neutral
 * and thin—affordance comes from background, not colored borders.
 */

/** Non-interactive cards (e.g. quote panel): white surface + neutral edge. */
export const CARD_SURFACE_STATIC =
  'rounded-none border border-slate-200 bg-white'

/**
 * @param {{ collected?: boolean }} opts
 * @returns {string} Tailwind classes for a full-card click target (navigate / open).
 */
export function cardInteractiveSurfaceClasses({ collected = false } = {}) {
  return [
    'rounded-none border border-slate-200 shadow-sm',
    collected
      ? 'bg-emerald-50/90 hover:bg-emerald-100/80'
      : 'bg-slate-50 hover:bg-slate-100/95',
    'cursor-pointer transition-[box-shadow,transform,background-color] duration-200',
    'motion-safe:hover:-translate-y-px hover:shadow-md',
    'active:translate-y-0 active:shadow-sm',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2',
  ].join(' ')
}
