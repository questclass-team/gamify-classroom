import { useEffect, useRef, useState } from 'react'
import { gsap } from '../../lib/gsap'
import { useReducedMotion } from '../../lib/useReducedMotion'

/**
 * A number that eases to `target` (expo out) whenever the target changes while `run` is true.
 * Before the first run it shows `initial`; under reduced motion it shows the target at once.
 */
export function useCountTo(target: number, run = true, initial = target, duration = 1.1) {
  const reduce = useReducedMotion()
  const [value, setValue] = useState(initial)
  const current = useRef(initial)

  useEffect(() => {
    if (!run || reduce || current.current === target) return
    const counter = { value: current.current }
    const tween = gsap.to(counter, {
      value: target,
      duration,
      ease: 'expo.out',
      onUpdate: () => {
        current.current = counter.value
        setValue(Math.round(counter.value))
      },
    })
    return () => {
      tween.kill()
    }
  }, [target, run, reduce, duration])

  if (reduce) return run ? target : initial
  return value
}
