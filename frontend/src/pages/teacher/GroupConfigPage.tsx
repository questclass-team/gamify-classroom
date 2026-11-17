import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
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
import { Alert, Button, ErrorWithRetry, Panel, SectionTitle, TextField } from '../../components/ui'
import {
  currencyIconError,
  validateGameConfig,
  type GameConfigDraft,
  type RankDraft,
} from './gameConfigValidation'
import { useGroup } from './groupContext'

const SAVE_ERRORS = {
  400: 'Serwer odrzucił konfigurację. Sprawdź nazwy, progi i plik ikony.',
}

type IconDraft =
  | { kind: 'saved'; url: string | null }
  | { kind: 'new'; file: File; previewUrl: string }
  | { kind: 'removed' }

type Notice = { tone: 'success' | 'error'; text: string }

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

  if (state.status === 'loading') return <p className="text-muted">Ładowanie konfiguracji…</p>
  if (state.status === 'error') {
    return <ErrorWithRetry message={apiErrorMessage(state.error)} onRetry={reload} />
  }
  return <ConfigForm groupId={group.id} initial={state.data} />
}

function ConfigForm({ groupId, initial }: { groupId: string; initial: GroupGameConfig }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [draft, setDraft] = useState(() => toDraft(initial))
  const [icon, setIcon] = useState<IconDraft>({ kind: 'saved', url: initial.currencyIconUrl })
  const [savedIconUrl, setSavedIconUrl] = useState(initial.currencyIconUrl)
  const [iconError, setIconError] = useState<string | null>(null)
  const [iconInputKey, setIconInputKey] = useState(0)
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const validation = useMemo(() => validateGameConfig(draft), [draft])
  // Errors appear only after the first save attempt, then follow every edit.
  const errors = submitted && !validation.valid ? validation.errors : null
  const currencyLabel = draft.currencyName.trim() || 'punkty'
  const iconUrl = icon.kind === 'new' ? icon.previewUrl : icon.kind === 'saved' ? icon.url : null

  useEffect(() => {
    if (icon.kind !== 'new') return
    return () => URL.revokeObjectURL(icon.previewUrl)
  }, [icon])

  function edit(change: (current: GameConfigDraft) => GameConfigDraft) {
    setDraft(change)
    setDirty(true)
    setNotice(null)
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
    edit((current) => ({ ...current, ranks: current.ranks.filter((rank) => rank.key !== key) }))
  }

  function chooseIcon(file: File | undefined) {
    if (file === undefined) return
    const error = currencyIconError(file)
    setIconError(error)
    if (error !== null) {
      setIconInputKey((value) => value + 1)
      return
    }
    setIcon({ kind: 'new', file, previewUrl: URL.createObjectURL(file) })
    setDirty(true)
    setNotice(null)
  }

  function removeIcon() {
    setIcon(savedIconUrl === null ? { kind: 'saved', url: null } : { kind: 'removed' })
    setIconError(null)
    setIconInputKey((value) => value + 1)
    setDirty(true)
    setNotice(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    if (!validation.valid) {
      setNotice({ tone: 'error', text: 'Popraw zaznaczone pola i zapisz ponownie.' })
      // Wait for the error state to render, then move focus to the first invalid field.
      requestAnimationFrame(() =>
        formRef.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus(),
      )
      return
    }

    setSaving(true)
    setNotice(null)
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
      setNotice({ tone: 'success', text: 'Zapisano konfigurację punktów i rang.' })
    } catch (error) {
      // The icon may already be stored even if saving the rest failed.
      if (storedIconUrl !== savedIconUrl) {
        setSavedIconUrl(storedIconUrl)
        setIcon({ kind: 'saved', url: storedIconUrl })
      }
      setNotice({ tone: 'error', text: apiErrorMessage(error, SAVE_ERRORS) })
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
      <Panel aria-labelledby="currency-heading">
        <div className="flex flex-col gap-1">
          <SectionTitle id="currency-heading">Waluta</SectionTitle>
          <p className="text-sm text-muted">
            Nazwa i grafika punktów, które studenci zdobywają w tej grupie.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <TextField
            id="currency-name"
            label="Nazwa waluty"
            placeholder="np. Złote monety, Punkty doświadczenia"
            maxLength={CURRENCY_NAME_MAX_LENGTH}
            value={draft.currencyName}
            error={errors?.currencyName}
            onChange={(event) =>
              edit((current) => ({ ...current, currencyName: event.target.value }))
            }
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="currency-icon" className="text-sm font-medium">
              Ikona waluty
            </label>
            <div className="flex items-center gap-3">
              <CurrencyIcon url={iconUrl} name={currencyLabel} size="lg" />
              <div className="flex min-w-0 flex-col items-start gap-2">
                <input
                  key={iconInputKey}
                  id="currency-icon"
                  type="file"
                  accept={CURRENCY_ICON_TYPES.join(',')}
                  aria-describedby="currency-icon-hint"
                  aria-invalid={iconError !== null || undefined}
                  className="max-w-full text-sm text-muted file:mr-3 file:min-h-9 file:cursor-pointer file:rounded-ui file:border-ui file:border-line-strong file:bg-surface file:px-3 file:font-sans file:text-sm file:font-semibold file:text-fg hover:file:bg-surface-muted"
                  onChange={(event) => chooseIcon(event.target.files?.[0])}
                />
                {iconUrl !== null && (
                  <button
                    type="button"
                    onClick={removeIcon}
                    className="text-sm font-medium text-error underline underline-offset-2 hover:no-underline"
                  >
                    Usuń ikonę
                  </button>
                )}
              </div>
            </div>
            <p id="currency-icon-hint" className="text-xs text-muted">
              PNG, GIF lub WebP do 256 KB. Najlepiej mała grafika pikselowa, np. 16×16 albo 32×32
              px.
            </p>
            {iconError !== null && <p className="text-xs font-medium text-error">{iconError}</p>}
          </div>
        </div>
      </Panel>

      <Panel aria-labelledby="ranks-heading">
        <div className="flex flex-col gap-1">
          <SectionTitle id="ranks-heading">Rangi</SectionTitle>
          <p className="text-sm text-muted">
            Student otrzymuje rangę, gdy jego saldo osiągnie próg. Progi muszą być różnymi,
            nieujemnymi liczbami całkowitymi; kolejność wierszy nie ma znaczenia.
          </p>
        </div>

        {draft.ranks.length === 0 ? (
          <Alert tone="info">
            Ta grupa nie ma jeszcze rang. Dodaj pierwszą, np. rangę startową z progiem 0.
          </Alert>
        ) : (
          <div className="flex flex-col gap-3">
            <div
              aria-hidden="true"
              className="hidden grid-cols-[2rem_minmax(0,1fr)_10rem_auto] gap-3 text-xs font-semibold text-muted sm:grid"
            >
              <span>#</span>
              <span>Nazwa rangi</span>
              <span>Próg ({currencyLabel})</span>
              <span className="w-[4.5rem]" />
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
        {errors?.list !== undefined && <Alert tone="error">{errors.list}</Alert>}

        <div>
          <Button variant="secondary" onClick={addRank} disabled={draft.ranks.length >= MAX_RANKS}>
            + Dodaj rangę
          </Button>
        </div>

        {previewRanks.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <h3 className="text-base font-semibold">Podgląd ścieżki</h3>
            <ol className="flex flex-wrap items-center gap-2">
              {previewRanks.map((rank, index) => (
                <li key={`${rank.name}-${rank.threshold}`} className="flex items-center gap-2">
                  {index > 0 && (
                    <span aria-hidden="true" className="text-line-strong">
                      →
                    </span>
                  )}
                  <span className="flex items-center gap-2 rounded-ui border border-line bg-canvas px-2.5 py-1.5 text-sm">
                    <span className="font-medium">{rank.name}</span>
                    <span className="flex items-center gap-1 text-xs text-muted tabular-nums">
                      od {rank.threshold}
                      <CurrencyIcon url={iconUrl} name={currencyLabel} size="sm" />
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </Panel>

      {notice !== null && <Alert tone={notice.tone}>{notice.text}</Alert>}

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        {dirty && <p className="mr-auto text-sm text-muted">Masz niezapisane zmiany.</p>}
        <Button type="submit" disabled={saving}>
          {saving ? 'Zapisywanie…' : 'Zapisz konfigurację'}
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
  return (
    <li className="grid grid-cols-1 items-start gap-3 rounded-ui border border-line p-3 sm:grid-cols-[2rem_minmax(0,1fr)_10rem_auto] sm:border-0 sm:p-0">
      <span aria-hidden="true" className="font-display text-sm font-semibold text-muted sm:pt-2.5">
        <span className="sm:hidden">Ranga </span>
        {number}.
      </span>
      <TextField
        id={`rank-name-${rank.key}`}
        label={`Nazwa rangi ${number}`}
        labelClassName="sm:sr-only"
        placeholder="np. Nowicjusz"
        maxLength={RANK_NAME_MAX_LENGTH}
        value={rank.name}
        error={errors?.name}
        autoFocus={autoFocus}
        onChange={(event) => onChange(rank.key, 'name', event.target.value)}
      />
      <TextField
        id={`rank-threshold-${rank.key}`}
        label={`Próg rangi ${number} (${currencyLabel})`}
        labelClassName="sm:sr-only"
        type="number"
        inputMode="numeric"
        min={0}
        max={RANK_THRESHOLD_MAX}
        step={1}
        value={rank.threshold}
        error={errors?.threshold}
        onChange={(event) => onChange(rank.key, 'threshold', event.target.value)}
        className="tabular-nums"
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="secondary"
          className="min-h-10 sm:w-[4.5rem]"
          aria-label={`Usuń rangę ${number}${rank.name.trim() ? ` „${rank.name.trim()}”` : ''}`}
          onClick={() => onRemove(rank.key)}
        >
          Usuń
        </Button>
      </div>
    </li>
  )
}

/** Currency icon drawn crisp at any size; a neutral placeholder when there is none. */
function CurrencyIcon({
  url,
  name,
  size,
}: {
  url: string | null
  name: string
  size: 'sm' | 'lg'
}) {
  const box = size === 'lg' ? 'size-14' : 'size-4'
  if (url === null) {
    return size === 'lg' ? (
      <span
        className={`${box} grid shrink-0 place-items-center rounded-ui border border-dashed border-line-strong text-xs text-muted`}
      >
        brak
      </span>
    ) : (
      <span className="sr-only">{name}</span>
    )
  }
  return (
    <img
      src={url}
      alt={size === 'lg' ? `Ikona waluty ${name}` : name}
      className={`${box} shrink-0 object-contain [image-rendering:pixelated] ${size === 'lg' ? 'rounded-ui border border-line bg-surface-muted p-2' : ''}`}
    />
  )
}
