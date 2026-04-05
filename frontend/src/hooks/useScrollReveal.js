import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Returns a [ref, isVisible] pair.
 * - Sections already in the viewport on mount are immediately visible (no animation).
 * - Sections below the fold start hidden and animate in when scrolled into view.
 */
export function useScrollReveal({ threshold = 0.12, rootMargin = '0px' } = {}) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  // useLayoutEffect runs synchronously after DOM paint — check position before
  // the browser shows anything, so there's no flash of hidden content.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setIsVisible(true)
    }
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Already visible — no observer needed
    if (isVisible) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [isVisible, threshold, rootMargin])

  return [ref, isVisible]
}
