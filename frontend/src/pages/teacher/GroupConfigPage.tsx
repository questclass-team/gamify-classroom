import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { apiErrorMessage } from '../../api/errorMessage'
import {
  deleteCurrencyIcon,
  fetchGameConfig,
  saveGameConfig,
  uploadCurrencyIcon,
} from '../../api/gameConfig'
import {
  CURRENCY_ICON_TYPES,
  CURRENCY_NAME_MAX_LENGTH,
  MAX_RANKS,
  RANK_NAME_MAX_LENGTH,
  RANK_THRESHOLD_MAX,
  type GroupGameConfig,
} from '../../api/types'
import { useApiData } from '../../api/useApiData'
import { BlaskNotice } from '../../components/blask/BlaskNotice'
import { Button } from '../../components/blask/Button'
import { buttonClass } from '../../components/blask/buttonClass'
import { Amount, CurrencyMark } from '../../components/blask/CurrencyMark'
import { TextField } from '../../components/blask/Field'
import { PlusIcon } from '../../components/blask/icons'
import { Panel } from '../../components/blask/Panel'
import { LoadingState, Skeleton } from '../../components/blask/States'
import { plural } from '../../format'
import { useShell } from '../../layout/shellContext'
import {
  currencyIconError,
  validateGameConfig,
  type GameConfigDraft,
  type RankDraft,
} from './gameConfigValidation'
import { useGroup } from './groupContext'
import { RankPath } from './RankPath'

const SAVE_ERRORS = {
  400: 'Serwer odrzucił konfigurację. Sprawdź nazwy, progi i plik ikony.',
}

type IconDraft =
  | { kind: 'saved'; url: string | null }
  | { kind: 'new'; file: File; previewUrl: string }
  | { kind: 'removed' }

function toDraft(config: GroupGameConfig): GameConfigDraft {
  return {
    currencyName: config.currencyName,
    ranks: config.ranks.map((rank) => ({
      key: crypto.randomUUID(),
      name: rank.name,
      threshold: String(rank.threshold),
    })),
  }
}

export function GroupConfigPage() {
  const { group } = useGroup()
  const load = useCallback((signal: AbortSignal) => fetchGameConfig(group.id, signal), [group.id])
  const { state, reload } = useApiData(load)

  if (state.status === 'loading') {
    return (
      <LoadingState label="Ładowanie konfiguracji…" className={LAYOUT}>
        <div className="flex flex-col gap-6">
          <div className="blask-panel h-56" />
          <div className="blask-panel flex flex-col gap-3 p-6">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
        <div className="blask-panel h-80" />
      </LoadingState>
    )
  }
  if (state.status === 'error') {
    return (
      <BlaskNotice tone="error" title="Nie udało się wczytać punktów i rang tej grupy.">
        <p className="text-sm">{apiErrorMessage(state.error)}</p>
        <Button variant="quiet" size="sm" className="self-start" onClick={reload}>
          Spróbuj ponownie
        </Button>
      </BlaskNotice>
    )
  }
  return <ConfigForm groupId={group.id} initial={state.data} />
}

const LAYOUT = 'grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]'

function ConfigForm({ groupId, initial }: { groupId: string; initial: GroupGameConfig }) {
  const { notify } = useShell()
  const formRef = useRef<HTMLFormElement>(null)
  const iconId = useId()
  const [draft, setDraft] = useState(() => toDraft(initial))
  const [icon, setIcon] = useState<IconDraft>({ kind: 'saved', url: initial.currencyIconUrl })
  const [savedIconUrl, setSavedIconUrl] = useState(initial.currencyIconUrl)
  const [iconError, setIconError] = useState<string | null>(null)
  const [iconInputKey, setIconInputKey] = useState(0)
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validation = useMemo(() => validateGameConfig(draft), [draft])
  // Errors appear only after the first save attempt, then follow every edit.
  const errors = submitted && !validation.valid ? validation.errors : null
  const errorCount =
    errors === null
      ? 0
      : (errors.currencyName ? 1 : 0) +
        (errors.list ? 1 : 0) +
        Object.values(errors.ranks).reduce(
          (sum, row) => sum + (row.name ? 1 : 0) + (row.threshold ? 1 : 0),
          0,
        )
  const currencyLabel = draft.currencyName.trim() || 'punkty'
  const iconUrl = icon.kind === 'new' ? icon.previewUrl : icon.kind === 'saved' ? icon.url : null
  const currency = { name: currencyLabel, iconUrl }

  useEffect(() => {
    if (icon.kind !== 'new') return
    return () => URL.revokeObjectURL(icon.previewUrl)
  }, [icon])

  function changed() {
    setDirty(true)
    setError(null)
  }

  function edit(change: (current: GameConfigDraft) => GameConfigDraft) {
    setDraft(change)
    changed()
  }

  function updateRank(key: string, field: 'name' | 'threshold', value: string) {
    edit((current) => ({
      ...current,
      ranks: current.ranks.map((rank) => (rank.key === key ? { ...rank, [field]: value } : rank)),
    }))
  }

  function addRank() {
    const key = crypto.randomUUID()
    edit((current) => {
      const thresholds = current.ranks.map((rank) => Number(rank.threshold)).filter(Number.isFinite)
      const next = thresholds.length === 0 ? 0 : Math.max(...thresholds) + 100
      return { ...current, ranks: [...current.ranks, { key, name: '', threshold: String(next) }] }
    })
    setFocusKey(key)
  }

  function removeRank(key: string) {
    const index = draft.ranks.findIndex((rank) => rank.key === key)
    const rest = draft.ranks.filter((rank) => rank.key !== key)
    edit((current) => ({ ...current, ranks: current.ranks.filter((rank) => rank.key !== key) }))
    // Focus the row that took its place (or the one above), else the add button.
    const neighbour = rest[Math.min(index, rest.length - 1)]
    requestAnimationFrame(() => {
      const form = formRef.current
      const target =
        neighbour === undefined
          ? form?.querySelector<HTMLElement>('[data-add-rank]')
          : form?.querySelector<HTMLElement>(`[data-remove-rank="${neighbour.key}"]`)
      target?.focus()
    })
  }

  function chooseIcon(file: File | undefined) {
    if (file === undefined) return
    const problem = currencyIconError(file)
    setIconError(problem)
    if (problem !== null) {
      setIconInputKey((value) => value + 1)
      return
    }
    setIcon({ kind: 'new', file, previewUrl: URL.createObjectURL(file) })
    changed()
  }

  function removeIcon() {
    setIcon(savedIconUrl === null ? { kind: 'saved', url: null } : { kind: 'removed' })
    setIconError(null)
    setIconInputKey((value) => value + 1)
    changed()
    requestAnimationFrame(() => document.getElementById(iconId)?.focus())
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSubmitted(true)
    if (!validation.valid) {
      // The save bar says how many fields need fixing (polite live region).
      setError(null)
      // Wait for the error state to render, then move focus to the first invalid field.
      requestAnimationFrame(() =>
        formRef.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus(),
      )
      return
    }

    setSaving(true)
    setError(null)
    let storedIconUrl = savedIconUrl
    try {
      if (icon.kind === 'new') {
        storedIconUrl = (await uploadCurrencyIcon(groupId, icon.file)).currencyIconUrl
      } else if (icon.kind === 'removed') {
        await deleteCurrencyIcon(groupId)
        storedIconUrl = null
      }
      const saved = await saveGameConfig(groupId, validation.request)
      setDraft(toDraft(saved))
      setIcon({ kind: 'saved', url: saved.currencyIconUrl })
      setSavedIconUrl(saved.currencyIconUrl)
      setSubmitted(false)
      setDirty(false)
      notify('Zapisano punkty i rangi.')
    } catch (caught) {
      // The icon may already be stored even if saving the rest failed.
      if (storedIconUrl !== savedIconUrl) {
        setSavedIconUrl(storedIconUrl)
        setIcon({ kind: 'saved', url: storedIconUrl })
      }
      setError(apiErrorMessage(caught, SAVE_ERRORS))
    } finally {
      setSaving(false)
    }
  }

  const previewRanks = draft.ranks
    .map((rank) => ({ name: rank.name.trim(), threshold: Number(rank.threshold) }))
    .filter((rank) => rank.name !== '' && Number.isInteger(rank.threshold) && rank.threshold >= 0)
    .toSorted((a, b) => a.threshold - b.threshold)

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className={LAYOUT}>
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Waluta">
            <div className="flex flex-col gap-6">
              <p className="blask-copy max-w-[62ch] text-blask-graphite">
                Nazwa i grafika punktów, które studenci zdobywają w tej grupie.
              </p>
              <TextField
                label="Nazwa waluty"
                placeholder="np. Złote monety"
                maxLength={CURRENCY_NAME_MAX_LENGTH}
                counter={{ length: draft.currencyName.length, max: CURRENCY_NAME_MAX_LENGTH }}
                value={draft.currencyName}
                error={errors?.currencyName}
                className="max-w-md"
                onChange={(event) =>
                  edit((current) => ({ ...current, currencyName: event.target.value }))
                }
              />

              <fieldset className="flex flex-col gap-2" aria-describedby={`${iconId}-hint`}>
                <legend className="blask-label mb-2">Ikona waluty</legend>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="blask-currency-tile">
                    <CurrencyMark iconUrl={iconUrl} className="size-10" />
                    <span className="sr-only">
                      {iconUrl === null
                        ? 'Bez własnej ikony: moneta Blask.'
                        : `Ikona waluty ${currencyLabel}.`}
                    </span>
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      key={iconInputKey}
                      id={iconId}
                      type="file"
                      accept={CURRENCY_ICON_TYPES.join(',')}
                      aria-invalid={iconError !== null || undefined}
                      aria-describedby={iconError !== null ? `${iconId}-error` : undefined}
                      className="blask-file-input sr-only"
                      onChange={(event) => chooseIcon(event.target.files?.[0])}
                    />
                    <label
                      htmlFor={iconId}
                      className={buttonClass({ variant: 'outline', size: 'sm' })}
                    >
                      {iconUrl === null ? 'Wybierz plik' : 'Zmień ikonę'}
                    </label>
                    {iconUrl !== null && (
                      <Button variant="quiet" size="sm" onClick={removeIcon}>
                        Usuń ikonę
                      </Button>
                    )}
                  </div>
                </div>
                <p id={`${iconId}-hint`} className="blask-hint">
                  {icon.kind === 'new'
                    ? `Nowa ikona: ${icon.file.name}. Zapiszesz ją razem z resztą ustawień.`
                    : icon.kind === 'removed'
                      ? 'Po zapisaniu studenci zobaczą monetę Blask.'
                      : iconUrl === null
                        ? 'Bez własnej ikony studenci widzą monetę Blask.'
                        : 'Studenci widzą ikonę grupy.'}{' '}
                  PNG, GIF lub WebP do 256 KB, najlepiej mała grafika pikselowa (16×16 albo 32×32
                  px).
                </p>
                {iconError !== null && (
                  <p id={`${iconId}-error`} role="alert" className="blask-field-error">
                    {iconError}
                  </p>
                )}
              </fieldset>
            </div>
          </Panel>

          <Panel
            title="Rangi"
            aside={
              <span className="blask-num">
                {draft.ranks.length} z {MAX_RANKS}
              </span>
            }
          >
            <div className="flex flex-col gap-5">
              <p className="blask-copy max-w-[62ch] text-blask-graphite">
                Student dostaje rangę, gdy jego saldo osiągnie próg. Progi to różne, nieujemne
                liczby całkowite; kolejność wierszy nie ma znaczenia.
              </p>

              {draft.ranks.length === 0 ? (
                <BlaskNotice tone="info" announce={false}>
                  Ta grupa nie ma jeszcze rang. Dodaj pierwszą, np. rangę startową z progiem 0.
                </BlaskNotice>
              ) : (
                <div className="blask-rank-editor flex flex-col gap-3">
                  <div aria-hidden="true" className="blask-rank-editor__head">
                    <span />
                    <span>Nazwa rangi</span>
                    <span>Próg ({currencyLabel})</span>
                    <span />
                  </div>
                  <ol className="flex flex-col gap-3">
                    {draft.ranks.map((rank, index) => (
                      <RankRow
                        key={rank.key}
                        rank={rank}
                        index={index}
                        currencyLabel={currencyLabel}
                        errors={errors?.ranks[rank.key]}
                        autoFocus={rank.key === focusKey}
                        onChange={updateRank}
                        onRemove={removeRank}
                      />
                    ))}
                  </ol>
                </div>
              )}
              {errors?.list !== undefined && <BlaskNotice tone="error">{errors.list}</BlaskNotice>}

              <div>
                <Button
                  variant="outline"
                  size="sm"
                  data-add-rank
                  onClick={addRank}
                  disabled={draft.ranks.length >= MAX_RANKS}
                >
                  <PlusIcon className="size-4" />
                  Dodaj rangę
                </Button>
              </div>
            </div>
          </Panel>
        </div>

        <Panel
          title="Podgląd ścieżki"
          className="lg:sticky lg:top-[calc(var(--blask-head-h)+1.5rem)]"
        >
          <div className="flex flex-col gap-5">
            <p className="text-sm text-blask-graphite">
              Tak studenci zobaczą walutę i rangi tej grupy.
            </p>
            <p className="flex items-center gap-2 text-blask-ink">
              <Amount
                value={120}
                currency={currency}
                className="font-blask-display text-2xl font-semibold"
              />
              <span aria-hidden="true" className="text-blask-graphite">
                {currencyLabel}
              </span>
            </p>
            {previewRanks.length > 0 ? (
              <RankPath ranks={previewRanks} currency={currency} />
            ) : (
              <p className="text-sm text-blask-graphite">
                Ścieżka pojawi się, gdy dodasz rangę z nazwą i progiem.
              </p>
            )}
          </div>
        </Panel>
      </div>

      {error !== null && <BlaskNotice tone="error">{error}</BlaskNotice>}
      <div className="blask-save-bar">
        <p aria-live="polite" className="mr-auto text-sm text-blask-graphite">
          {errorCount > 0
            ? `${errorCount} ${plural(errorCount, 'pole wymaga', 'pola wymagają', 'pól wymaga')} poprawy.`
            : dirty
              ? 'Masz niezapisane zmiany.'
              : 'Wszystkie zmiany są zapisane.'}
        </p>
        <Button variant="primary" type="submit" busy={saving} busyLabel="Zapisywanie…">
          Zapisz zmiany
        </Button>
      </div>
    </form>
  )
}

interface RankRowProps {
  rank: RankDraft
  index: number
  currencyLabel: string
  errors: { name?: string; threshold?: string } | undefined
  autoFocus: boolean
  onChange: (key: string, field: 'name' | 'threshold', value: string) => void
  onRemove: (key: string) => void
}

function RankRow({
  rank,
  index,
  currencyLabel,
  errors,
  autoFocus,
  onChange,
  onRemove,
}: RankRowProps) {
  const number = index + 1
  const name = rank.name.trim()
  return (
    <li className="blask-rank-row">
      <span aria-hidden="true" className="blask-rank-row__number">
        <span className="sm:hidden">Ranga </span>
        {number}
      </span>
      <TextField
        label={`Nazwa rangi ${number}`}
        placeholder="np. Nowicjusz"
        maxLength={RANK_NAME_MAX_LENGTH}
        value={rank.name}
        error={errors?.name}
        autoFocus={autoFocus}
        onChange={(event) => onChange(rank.key, 'name', event.target.value)}
      />
      <TextField
        label={`Próg rangi ${number} (${currencyLabel})`}
        type="number"
        inputMode="numeric"
        min={0}
        max={RANK_THRESHOLD_MAX}
        step={1}
        value={rank.threshold}
        error={errors?.threshold}
        onChange={(event) => onChange(rank.key, 'threshold', event.target.value)}
      />
      <Button
        variant="quiet"
        size="sm"
        className="blask-rank-row__remove"
        data-remove-rank={rank.key}
        aria-label={`Usuń rangę ${number}${name ? ` „${name}”` : ''}`}
        onClick={() => onRemove(rank.key)}
      >
        Usuń
      </Button>
    </li>
  )
}
