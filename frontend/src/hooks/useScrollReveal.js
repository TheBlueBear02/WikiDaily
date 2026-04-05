import { useEffect, useRef, useState } from 'react'

/**
 * Returns a [ref, isVisible] pair. Once the element enters the viewport
 * it stays visible (one-shot reveal). You can customise the threshold and
 * rootMargin to control when the trigger fires.
 */
export function useScrollReveal({ threshold = 0.12, rootMargin = '0px' } = {}) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

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
  }, [threshold, rootMargin])

  return [ref, isVisible]
}
