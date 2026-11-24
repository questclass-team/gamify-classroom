import { useId } from 'react'

/** QuestClass in Blask: the wordmark with a thin beam of light and a pearl drop beside it. */
export function Wordmark() {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return (
    <span className="inline-flex items-center gap-2">
      <svg aria-hidden="true" width="10" height="26" viewBox="0 0 10 26" className="flex-none">
        <defs>
          <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#afc0ff" stopOpacity="0" />
            <stop offset="0.45" stopColor="#8e9bff" />
            <stop offset="1" stopColor="#2b3bff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={`${id}-drop`} cx="0.34" cy="0.3" r="0.85">
            <stop offset="0" stopColor="#fbfaff" />
            <stop offset="0.45" stopColor="#8e9bff" />
            <stop offset="1" stopColor="#6c3bf4" />
          </radialGradient>
        </defs>
        <rect x="4" y="0" width="2" height="26" rx="1" fill={`url(#${id}-beam)`} />
        <circle cx="5" cy="16" r="4" fill={`url(#${id}-drop)`} />
      </svg>
      <span className="blask-display text-[1.375rem] font-bold tracking-[-0.03em]">QuestClass</span>
    </span>
  )
}
