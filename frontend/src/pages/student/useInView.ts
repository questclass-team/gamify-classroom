import { useEffect, useState, type RefObject } from 'react'

/**
 * True once the element has come into view (and stays true), so a drawing can play its one
 * entrance when the student reaches it. Without IntersectionObserver it is true at once.
 */
export function useInView(
  ref: RefObject<Element | null>,
  rootMargin = '0px 0px -15% 0px',
): boolean {
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const element = ref.current
    if (seen || element === null) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, rootMargin, seen])

  return seen
}
