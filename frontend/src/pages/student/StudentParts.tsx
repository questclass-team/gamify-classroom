import { Link } from 'react-router'
import { apiErrorMessage } from '../../api/errorMessage'
import { BlaskNotice } from '../../components/blask/BlaskNotice'

/** A group the student is not in (or that is gone): no details, a calm way back. */
export function GroupNotFound() {
  return (
    <section
      aria-labelledby="group-not-found"
      className="blask-panel flex flex-col items-start gap-3 p-6 sm:p-8"
    >
      <h1 id="group-not-found" className="blask-page-title">
        Nie znaleziono grupy
      </h1>
      <p className="max-w-[56ch] text-blask-graphite">
        Ta grupa nie istnieje albo nie należysz do niej. Jeśli prowadzący dopiero ma Cię dodać, po
        dodaniu zobaczysz ją w Moich grupach.
      </p>
      <Link to="/student" className="blask-btn blask-btn-primary mt-1 no-underline">
        Wróć do Moich grup
      </Link>
    </section>
  )
}

/** A failed load with the Polish reason and one way to try again. */
export function LoadError({
  title,
  error,
  onRetry,
}: {
  title: string
  error: unknown
  onRetry: () => void
}) {
  return (
    <BlaskNotice tone="error" title={title}>
      <p className="text-sm">{apiErrorMessage(error)}</p>
      <button
        type="button"
        className="blask-btn blask-btn-sm blask-btn-quiet mt-1 self-start"
        onClick={onRetry}
      >
        Spróbuj ponownie
      </button>
    </BlaskNotice>
  )
}
