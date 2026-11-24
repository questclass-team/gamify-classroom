import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { apiErrorMessage } from '../../../api/errorMessage'
import {
  BADGE_DESCRIPTION_MAX_LENGTH,
  BADGE_ICONS,
  BADGE_NAME_MAX_LENGTH,
  REWARD_REASON_MAX_LENGTH,
  type AwardPointsRequest,
  type Badge,
  type BadgeIcon,
  type CreateBadgeRequest,
} from '../../../api/types'
import type { LoadState } from '../../../api/useApiData'
import { BadgeMark } from '../../../components/blask/BadgeMark'
import { BlaskNotice } from '../../../components/blask/BlaskNotice'
import { Amount, CurrencyMark, type Currency } from '../../../components/blask/CurrencyMark'
import { PlusIcon, SpinnerIcon } from '../../../components/blask/icons'
import { plural } from '../../../format'
import {
  amountError,
  validateNewBadge,
  validatePointsAward,
  type BadgeDraft,
  type BadgeErrors,
  type PointsErrors,
} from './awardForm'
import { namesList, type BulkSummary } from './bulkAward'

const QUICK_AMOUNTS = [5, 10, 20, 50]
const NEW_BADGE = 'new'
const BADGE_ICON_LABEL: Record<BadgeIcon, string> = {
  medal: 'Medal',
  star: 'Gwiazda',
  trophy: 'Puchar',
}

export type BadgeChoice =
  { kind: 'existing'; badge: Badge } | { kind: 'new'; request: Required<CreateBadgeRequest> }

interface AwardPanelProps {
  currency: Currency
  /** Names of the selected students, in list order. */
  recipients: string[]
  badges: LoadState<Badge[]>
  onReloadBadges: () => void
  /** Progress of the running batch; null when idle. */
  busy: { done: number; total: number } | null
  result: BulkSummary | null
  /** Hides the last result (when the teacher switches to the other kind of award). */
  onDismissResult: () => void
  /** Resolves true when everyone got the award, so the form starts over. */
  onAwardPoints: (request: Required<AwardPointsRequest>) => Promise<boolean>
  /** `badgeId`: the awarded badge (a new one once created); null when creating it failed. */
  onAwardBadge: (choice: BadgeChoice) => Promise<{ allAwarded: boolean; badgeId: number | null }>
}

/** "Przyznaj nagrodę": points or a badge for every selected student, with a plain summary. */
export function AwardPanel(props: AwardPanelProps) {
  const [kind, setKind] = useState<'points' | 'badge'>('points')
  const { currency, busy, result, onDismissResult } = props

  function switchKind(next: 'points' | 'badge') {
    setKind(next)
    onDismissResult()
  }

  return (
    <section
      id="award-panel"
      aria-labelledby="award-panel-title"
      className="blask-panel scroll-mt-6 lg:sticky lg:top-6"
    >
      <div className="blask-panel-head">
        <h2 id="award-panel-title" className="blask-panel-title">
          Przyznaj nagrodę
        </h2>
      </div>
      <div className="flex flex-col gap-5 p-5">
        <fieldset>
          <legend className="sr-only">Rodzaj nagrody</legend>
          <div className="blask-seg grid w-full grid-cols-2">
            <label>
              <input
                type="radio"
                name="award-kind"
                checked={kind === 'points'}
                disabled={busy !== null}
                onChange={() => switchKind('points')}
              />
              <CurrencyMark iconUrl={currency.iconUrl} />
              <span className="truncate">{currency.name}</span>
            </label>
            <label>
              <input
                type="radio"
                name="award-kind"
                checked={kind === 'badge'}
                disabled={busy !== null}
                onChange={() => switchKind('badge')}
              />
              <BadgeMark icon="medal" size={18} />
              Odznaka
            </label>
          </div>
        </fieldset>

        {kind === 'points' ? <PointsForm {...props} /> : <BadgeForm {...props} />}

        {/* Stays in the page (empty) so screen readers announce each new result. */}
        <div role="status" aria-live="polite" aria-atomic="true" className="empty:-mt-5">
          {result !== null && busy === null && (
            <BlaskNotice
              tone={result.tone}
              title={result.title}
              announce={false}
              className="blask-pop"
            >
              {result.lines.length > 0 && (
                <ul className="flex flex-col gap-1 text-sm">
                  {result.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
            </BlaskNotice>
          )}
        </div>
      </div>
    </section>
  )
}

function Recipients({ names, error }: { names: string[]; error?: string }) {
  if (names.length === 0) {
    return error === undefined ? (
      <p className="text-[0.9375rem] text-blask-graphite">
        Zaznacz osoby na liście: jedną, kilka albo całą grupę.
      </p>
    ) : (
      <p id="award-selection-error" className="text-[0.9375rem] font-medium text-blask-raspberry">
        {error}
      </p>
    )
  }
  return (
    <p className="text-[0.9375rem]">
      <span className="text-blask-graphite">Dla: </span>
      <span className="font-semibold">{namesList(names)}</span>
    </p>
  )
}

function SubmitButton({
  busy,
  count,
  children,
}: {
  busy: AwardPanelProps['busy']
  count: number
  children: string
}) {
  return (
    <button
      type="submit"
      className="blask-btn blask-btn-primary w-full"
      data-busy={busy !== null}
      aria-disabled={busy !== null || undefined}
    >
      {busy !== null ? (
        <>
          <SpinnerIcon />
          <span className="blask-num">
            Przyznawanie… {busy.done} z {busy.total}
          </span>
        </>
      ) : count > 0 ? (
        `${children} ${count} ${plural(count, 'osobie', 'osobom', 'osobom')}`
      ) : (
        children
      )}
    </button>
  )
}

/** Moves focus to the first invalid field after the error state has rendered. */
function focusFirstInvalid(form: HTMLFormElement | null) {
  requestAnimationFrame(() =>
    form?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]')?.focus(),
  )
}

function PointsForm({ currency, recipients, busy, onAwardPoints }: AwardPanelProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const validation = validatePointsAward({ amount, reason }, recipients.length)
  const errors: PointsErrors = submitted && !validation.valid ? validation.errors : {}
  const points = amountError(amount) === null ? Number(amount.trim()) : null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy !== null) return
    setSubmitted(true)
    if (!validation.valid) {
      focusFirstInvalid(formRef.current)
      return
    }
    if (await onAwardPoints(validation.request)) {
      setAmount('')
      setReason('')
      setSubmitted(false)
    }
  }

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Recipients names={recipients} error={errors.selection} />

      <Field
        id="award-amount"
        label={
          <>
            Ile <span className="font-normal text-blask-graphite">({currency.name})</span>
          </>
        }
        error={errors.amount}
      >
        {(describedBy) => (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-40">
              <input
                id="award-amount"
                className="blask-input blask-num pr-10"
                inputMode="numeric"
                autoComplete="off"
                placeholder="np. 10"
                value={amount}
                aria-invalid={errors.amount !== undefined || undefined}
                aria-describedby={describedBy}
                onChange={(event) => setAmount(event.target.value)}
              />
              <CurrencyMark
                iconUrl={currency.iconUrl}
                className="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2"
              />
            </div>
            <div role="group" aria-label="Szybki wybór" className="flex flex-wrap gap-1.5">
              {QUICK_AMOUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className="blask-pill blask-num"
                  aria-pressed={amount.trim() === String(value)}
                  onClick={() => setAmount(String(value))}
                >
                  +{value}
                </button>
              ))}
            </div>
          </div>
        )}
      </Field>

      <Field
        id="award-reason"
        label="Za co"
        error={errors.reason}
        counter={{ length: reason.length, max: REWARD_REASON_MAX_LENGTH }}
      >
        {(describedBy) => (
          <textarea
            id="award-reason"
            className="blask-input"
            rows={3}
            maxLength={REWARD_REASON_MAX_LENGTH}
            placeholder="np. Aktywność na zajęciach"
            value={reason}
            aria-invalid={errors.reason !== undefined || undefined}
            aria-describedby={describedBy}
            onChange={(event) => setReason(event.target.value)}
          />
        )}
      </Field>

      {points !== null && recipients.length > 0 && (
        <p className="rounded-xl bg-blask-paper px-3.5 py-3 text-[0.9375rem] leading-relaxed">
          {namesList(recipients)} {recipients.length === 1 ? 'dostanie ' : 'dostaną po '}
          <Amount value={points} currency={currency} signed className="font-semibold" />
          {recipients.length > 1 && (
            <>
              . Razem{' '}
              <Amount
                value={points * recipients.length}
                currency={currency}
                className="font-semibold"
              />
            </>
          )}
          .
        </p>
      )}

      <SubmitButton busy={busy} count={recipients.length}>
        Przyznaj
      </SubmitButton>
    </form>
  )
}

function BadgeForm({ recipients, busy, badges, onReloadBadges, onAwardBadge }: AwardPanelProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [choice, setChoice] = useState<string | null>(null)
  const [draft, setDraft] = useState<BadgeDraft>({ name: '', description: '', icon: 'medal' })
  const [submitted, setSubmitted] = useState(false)

  const catalog = badges.status === 'ready' ? badges.data : []
  // With an empty catalog the only way is a new badge.
  const selected = badges.status === 'ready' && catalog.length === 0 ? NEW_BADGE : (choice ?? null)
  const existing = catalog.find((badge) => String(badge.id) === selected) ?? null
  const creating = selected === NEW_BADGE
  const badgeValidation = validateNewBadge(draft)
  const badgeErrors: BadgeErrors =
    submitted && creating && !badgeValidation.valid ? badgeValidation.errors : {}
  const selectionError =
    submitted && recipients.length === 0 ? 'Zaznacz na liście co najmniej jedną osobę.' : undefined
  const choiceError =
    submitted && selected === null ? 'Wybierz odznakę albo utwórz nową.' : undefined
  const badgeName = creating ? draft.name.trim() : (existing?.name ?? '')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy !== null) return
    setSubmitted(true)
    let award: BadgeChoice | null = null
    if (existing !== null) award = { kind: 'existing', badge: existing }
    else if (creating && badgeValidation.valid) {
      award = { kind: 'new', request: badgeValidation.request }
    }
    if (award === null || recipients.length === 0) {
      focusFirstInvalid(formRef.current)
      return
    }
    const outcome = await onAwardBadge(award)
    if (outcome.badgeId !== null) {
      // A new badge is in the catalog now: a retry awards it instead of creating it again.
      setDraft({ name: '', description: '', icon: 'medal' })
      setChoice(outcome.allAwarded ? null : String(outcome.badgeId))
      if (outcome.allAwarded) setSubmitted(false)
    }
  }

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Recipients names={recipients} error={selectionError} />

      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={choiceError === undefined ? undefined : 'award-badge-error'}
      >
        <legend className="mb-2 text-[0.9375rem] font-semibold">Odznaka</legend>
        {badges.status === 'loading' && (
          <div className="flex flex-col gap-2" aria-label="Ładowanie odznak">
            {[0, 1, 2].map((row) => (
              <span key={row} className="blask-skeleton h-14 w-full rounded-xl" />
            ))}
          </div>
        )}
        {badges.status === 'error' && (
          <BlaskNotice tone="error" title="Nie udało się wczytać odznak.">
            <p className="text-sm">{apiErrorMessage(badges.error)}</p>
            <button
              type="button"
              className="blask-btn blask-btn-sm blask-btn-quiet mt-1 self-start"
              onClick={onReloadBadges}
            >
              Spróbuj ponownie
            </button>
          </BlaskNotice>
        )}
        {badges.status === 'ready' && catalog.length === 0 && (
          <p className="text-sm text-blask-graphite">
            Ta grupa nie ma jeszcze odznak. Utwórz pierwszą: nazwa, krótki opis i ikona.
          </p>
        )}
        {badges.status === 'ready' && (
          <div className="-m-1 grid max-h-[19rem] content-start gap-2 overflow-y-auto p-1">
            {catalog.map((badge) => (
              <label key={badge.id} className="blask-pick">
                <input
                  type="radio"
                  name="award-badge"
                  value={badge.id}
                  checked={selected === String(badge.id)}
                  data-invalid={choiceError !== undefined || undefined}
                  onChange={() => setChoice(String(badge.id))}
                />
                <BadgeMark icon={badge.icon} size={36} />
                <span className="flex min-w-0 flex-col">
                  <span className="leading-snug font-semibold">{badge.name}</span>
                  {badge.description !== '' && (
                    <span className="text-sm leading-snug text-blask-graphite">
                      {badge.description}
                    </span>
                  )}
                </span>
              </label>
            ))}
            {catalog.length > 0 && (
              <label className="blask-pick">
                <input
                  type="radio"
                  name="award-badge"
                  value={NEW_BADGE}
                  checked={creating}
                  onChange={() => setChoice(NEW_BADGE)}
                />
                <span className="grid size-9 flex-none place-items-center rounded-full border border-dashed border-blask-lavender text-blask-cobalt">
                  <PlusIcon />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="leading-snug font-semibold">Nowa odznaka</span>
                  <span className="text-sm leading-snug text-blask-graphite">
                    Utwórz ją i od razu przyznaj
                  </span>
                </span>
              </label>
            )}
          </div>
        )}
        {choiceError !== undefined && (
          <p id="award-badge-error" className="text-sm font-medium text-blask-raspberry">
            {choiceError}
          </p>
        )}
      </fieldset>

      {creating && (
        <NewBadgeFields
          draft={draft}
          errors={badgeErrors}
          onChange={(change) => setDraft((current) => ({ ...current, ...change }))}
        />
      )}

      {recipients.length > 0 && badgeName !== '' && (
        <p className="rounded-xl bg-blask-paper px-3.5 py-3 text-[0.9375rem] leading-relaxed">
          {namesList(recipients)} {recipients.length === 1 ? 'dostanie' : 'dostaną'} odznakę{' '}
          <span className="font-semibold">„{badgeName}”</span>.
          {recipients.length > 1 && !creating && ' Kto już ją ma, zachowa ją bez zmian.'}
        </p>
      )}

      <SubmitButton busy={busy} count={recipients.length}>
        {creating ? 'Utwórz i przyznaj' : 'Przyznaj odznakę'}
      </SubmitButton>
    </form>
  )
}

function NewBadgeFields({
  draft,
  errors,
  onChange,
}: {
  draft: BadgeDraft
  errors: BadgeErrors
  onChange: (change: Partial<BadgeDraft>) => void
}) {
  return (
    <div className="blask-pop flex flex-col gap-4 rounded-2xl bg-blask-paper p-4">
      <Field
        id="badge-name"
        label="Nazwa odznaki"
        error={errors.name}
        counter={{ length: draft.name.length, max: BADGE_NAME_MAX_LENGTH }}
      >
        {(describedBy) => (
          <input
            id="badge-name"
            className="blask-input"
            maxLength={BADGE_NAME_MAX_LENGTH}
            autoComplete="off"
            placeholder="np. Pomocna dłoń"
            value={draft.name}
            aria-invalid={errors.name !== undefined || undefined}
            aria-describedby={describedBy}
            onChange={(event) => onChange({ name: event.target.value })}
          />
        )}
      </Field>
      <Field
        id="badge-description"
        label={
          <>
            Opis <span className="font-normal text-blask-graphite">(opcjonalnie)</span>
          </>
        }
        error={errors.description}
        counter={{ length: draft.description.length, max: BADGE_DESCRIPTION_MAX_LENGTH }}
      >
        {(describedBy) => (
          <textarea
            id="badge-description"
            className="blask-input"
            rows={2}
            maxLength={BADGE_DESCRIPTION_MAX_LENGTH}
            placeholder="Za co ją przyznajesz, np. za pomoc innym w czasie zajęć"
            value={draft.description}
            aria-invalid={errors.description !== undefined || undefined}
            aria-describedby={describedBy}
            onChange={(event) => onChange({ description: event.target.value })}
          />
        )}
      </Field>
      <fieldset>
        <legend className="mb-2 text-[0.9375rem] font-semibold">Ikona</legend>
        <div className="grid grid-cols-3 gap-2">
          {BADGE_ICONS.map((icon) => (
            <label key={icon} className="blask-pick flex-col justify-center gap-1.5 py-3 text-sm">
              <input
                type="radio"
                name="badge-icon"
                checked={draft.icon === icon}
                onChange={() => onChange({ icon })}
              />
              <BadgeMark icon={icon} size={36} />
              {BADGE_ICON_LABEL[icon]}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  )
}

/** Label, control, optional character counter and error, wired with aria-describedby. */
function Field({
  id,
  label,
  error,
  counter,
  children,
}: {
  id: string
  label: ReactNode
  error?: string
  counter?: { length: number; max: number }
  children: (describedBy: string | undefined) => ReactNode
}) {
  const counterId = useId()
  const describedBy =
    [counter && counterId, error !== undefined && `${id}-error`].filter(Boolean).join(' ') ||
    undefined
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[0.9375rem] font-semibold">
          {label}
        </label>
        {counter && (
          <span
            id={counterId}
            className={`blask-num text-xs ${counter.length >= counter.max ? 'font-semibold text-blask-raspberry' : 'text-blask-graphite'}`}
          >
            <span className="sr-only">Znaki: </span>
            {counter.length}/{counter.max}
          </span>
        )}
      </div>
      {children(describedBy)}
      {error !== undefined && (
        <p id={`${id}-error`} className="text-sm font-medium text-blask-raspberry">
          {error}
        </p>
      )}
    </div>
  )
}
