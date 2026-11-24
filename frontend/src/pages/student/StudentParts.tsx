import { apiErrorMessage } from '../../api/errorMessage'
import { BlaskNotice } from '../../components/blask/BlaskNotice'
import { Button, LinkButton } from '../../components/blask/Button'
import { EmptyState } from '../../components/blask/States'

/** A group the student is not in (or that is gone): no details, a calm way back. */
export function GroupNotFound() {
  return (
    <EmptyState
      title="Nie znaleziono grupy"
      action={
        <LinkButton variant="primary" to="/student">
          Wróć do Moich grup
        </LinkButton>
      }
    >
      <p>
        Ta grupa nie istnieje albo nie należysz do niej. Jeśli prowadzący dopiero ma Cię dodać, po
        dodaniu zobaczysz ją w Moich grupach.
      </p>
    </EmptyState>
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
      <Button variant="outline" size="sm" className="mt-1 self-start" onClick={onRetry}>
        Spróbuj ponownie
      </Button>
    </BlaskNotice>
  )
}
