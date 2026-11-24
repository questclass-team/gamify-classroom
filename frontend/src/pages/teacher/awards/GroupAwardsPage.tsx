import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError } from '../../../api/client'
import { apiErrorMessage } from '../../../api/errorMessage'
import {
  awardBadge,
  createBadge,
  fetchBadges,
  fetchStudentBadges,
  revokeBadge,
} from '../../../api/badges'
import { fetchGameConfig } from '../../../api/gameConfig'
import { mapLimited } from '../../../api/mapLimited'
import { awardPoints, fetchRewardHistory, fetchStudentProgress } from '../../../api/rewards'
import type {
  AwardPointsRequest,
  BadgeAward,
  GroupDetail,
  GroupGameConfig,
  GroupStudent,
} from '../../../api/types'
import { useApiData } from '../../../api/useApiData'
import { useAuth } from '../../../auth/authContext'
import { BlaskConfirmDialog } from '../../../components/blask/BlaskConfirmDialog'
import { BlaskNotice } from '../../../components/blask/BlaskNotice'
import { Button, LinkButton } from '../../../components/blask/Button'
import { EmptyState, LoadingState } from '../../../components/blask/States'
import type { Currency } from '../../../components/blask/CurrencyMark'
import { rankForBalance } from '../../../components/blask/ranks'
import { useGroup } from '../groupContext'
import { AwardPanel, type BadgeChoice } from './AwardPanel'
import {
  AWARD_CONCURRENCY,
  summarizeBulk,
  type BulkAward,
  type BulkOutcome,
  type BulkSummary,
} from './bulkAward'
import { StudentDetail, type DetailState, type ProgressState } from './StudentDetail'
import { StudentList } from './StudentList'

const POINTS_ERRORS = {
  400: 'Saldo przekroczyłoby limit albo kwota jest nieprawidłowa.',
  404: 'Ta osoba nie należy już do grupy.',
}
const BADGE_ERRORS = {
  404: 'Ta osoba nie należy już do grupy albo odznaka została usunięta.',
}
const CREATE_BADGE_ERRORS = {
  400: 'Serwer odrzucił odznakę. Sprawdź nazwę, opis i ikonę.',
}

/** `/teacher/groups/:groupId/awards`: award points and badges, with each student's history. */
export function GroupAwardsPage() {
  const { group } = useGroup()
  const load = useCallback((signal: AbortSignal) => fetchGameConfig(group.id, signal), [group.id])
  const { state, reload } = useApiData(load)

  return (
    <div className="flex flex-col gap-6">
      {group.students.length === 0 ? (
        <EmptyState
          title="Najpierw dodaj studentów"
          action={
            <LinkButton variant="primary" to={`/teacher/groups/${group.id}`}>
              Przejdź do zakładki Studenci
            </LinkButton>
          }
        >
          <p>
            Nagrody przyznajesz osobom z tej grupy, a na razie nikogo w niej nie ma. Dodaj studentów
            w zakładce Studenci, a potem wróć tutaj.
          </p>
        </EmptyState>
      ) : state.status === 'loading' ? (
        <LoadingState
          label="Ładowanie nagród…"
          className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]"
        >
          <div className="blask-panel h-96" />
          <div className="blask-panel h-72" />
        </LoadingState>
      ) : state.status === 'error' ? (
        <BlaskNotice tone="error" title="Nie udało się wczytać ustawień punktów tej grupy.">
          <p className="text-sm">{apiErrorMessage(state.error)}</p>
          <Button variant="quiet" size="sm" className="mt-1 self-start" onClick={reload}>
            Spróbuj ponownie
          </Button>
        </BlaskNotice>
      ) : (
        <AwardsWorkspace group={group} config={state.data} />
      )}
    </div>
  )
}

type Busy = { done: number; total: number }

function AwardsWorkspace({ group, config }: { group: GroupDetail; config: GroupGameConfig }) {
  const { state: auth } = useAuth()
  const currentUserId = auth.status === 'authenticated' ? auth.user.id : ''
  const currency: Currency = { name: config.currencyName, iconUrl: config.currencyIconUrl }

  const students = useMemo(
    () => group.students.toSorted((a, b) => a.displayName.localeCompare(b.displayName, 'pl')),
    [group.students],
  )
  const [progress, setProgress] = useState<Record<string, ProgressState>>(() =>
    Object.fromEntries(students.map((student) => [student.id, { status: 'loading' }])),
  )
  const [details, setDetails] = useState<Record<string, DetailState>>({})
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [openId, setOpenId] = useState<string | null>(null)
  const [busy, setBusy] = useState<Busy | null>(null)
  const [result, setResult] = useState<BulkSummary | null>(null)
  const [freshKeys, setFreshKeys] = useState<ReadonlySet<string>>(new Set())
  const [pendingRevoke, setPendingRevoke] = useState<BadgeAward | null>(null)
  const [revoking, setRevoking] = useState(false)
  const [revokeError, setRevokeError] = useState<string | null>(null)
  const [revoked, setRevoked] = useState<{ studentId: string; text: string } | null>(null)
  // Where focus goes once the revoke dialog has closed (the page is inert while it is open).
  const focusAfterRevoke = useRef<string | null>(null)

  const loadBadges = useCallback((signal: AbortSignal) => fetchBadges(group.id, signal), [group.id])
  const { state: badges, reload: reloadBadges, update: updateBadges } = useApiData(loadBadges)

  // Requests started by clicks are aborted when the page goes away.
  const signalRef = useRef<AbortSignal | null>(null)

  /** Fetches balances a few at a time; each row fills in as soon as its answer arrives. */
  const loadProgress = useCallback(
    (ids: readonly string[], signal: AbortSignal) =>
      mapLimited(ids, AWARD_CONCURRENCY, async (id) => {
        try {
          const { balance, rank } = await fetchStudentProgress(group.id, id, signal)
          setProgress((current) => ({ ...current, [id]: { status: 'ready', balance, rank } }))
        } catch {
          if (!signal.aborted) setProgress((current) => ({ ...current, [id]: { status: 'error' } }))
        }
      }),
    [group.id],
  )

  useEffect(() => {
    const controller = new AbortController()
    signalRef.current = controller.signal
    void loadProgress(
      students.map((student) => student.id),
      controller.signal,
    )
    return () => controller.abort()
  }, [students, loadProgress])

  function retryProgress() {
    const failed = students
      .filter((student) => progress[student.id]?.status === 'error')
      .map((student) => student.id)
    if (signalRef.current === null || failed.length === 0) return
    setProgress((current) => ({
      ...current,
      ...Object.fromEntries(failed.map((id) => [id, { status: 'loading' } as const])),
    }))
    void loadProgress(failed, signalRef.current)
  }

  async function loadDetail(studentId: string) {
    const signal = signalRef.current ?? undefined
    setDetails((current) => ({ ...current, [studentId]: { status: 'loading' } }))
    try {
      const [rewards, awards] = await Promise.all([
        fetchRewardHistory(group.id, studentId, signal),
        fetchStudentBadges(group.id, studentId, signal),
      ])
      setDetails((current) => ({
        ...current,
        [studentId]: { status: 'ready', rewards, badges: awards },
      }))
    } catch (error) {
      if (signal?.aborted) return
      setDetails((current) => ({ ...current, [studentId]: { status: 'error', error } }))
    }
  }

  function toggleOpen(studentId: string) {
    if (openId === studentId) {
      setOpenId(null)
      return
    }
    setOpenId(studentId)
    setRevoked(null)
    const known = details[studentId]
    if (known === undefined || known.status === 'error') void loadDetail(studentId)
  }

  function select(ids: readonly string[], checked: boolean) {
    setSelected((current) => {
      const next = new Set(current)
      for (const id of ids) {
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  function updateDetail(
    studentId: string,
    change: (ready: Extract<DetailState, { status: 'ready' }>) => DetailState,
  ) {
    setDetails((current) => {
      const known = current[studentId]
      return known?.status === 'ready' ? { ...current, [studentId]: change(known) } : current
    })
  }

  /**
   * Sends one request per selected student (a few at a time), applies each success locally and
   * ends with a notice that names every failure. Students who got the award (or already had it)
   * are unselected, failed ones stay selected for another try.
   */
  async function runBatch(
    award: BulkAward,
    send: (student: GroupStudent) => Promise<'ok' | 'duplicate'>,
    errors: Record<number, string>,
  ): Promise<boolean> {
    const targets = students.filter((student) => selected.has(student.id))
    setResult(null)
    setBusy({ done: 0, total: targets.length })
    const settled = await mapLimited(targets, AWARD_CONCURRENCY, async (student) => {
      try {
        return await send(student)
      } finally {
        setBusy((current) => current && { ...current, done: current.done + 1 })
      }
    })
    const outcomes = settled.map((outcome, index): BulkOutcome => {
      const name = targets[index].displayName
      return outcome.status === 'fulfilled'
        ? { name, status: outcome.value }
        : { name, status: 'failed', error: apiErrorMessage(outcome.reason, errors) }
    })
    const done = targets.filter((_, index) => outcomes[index].status !== 'failed')
    select(
      done.map((student) => student.id),
      false,
    )
    setBusy(null)
    setResult(summarizeBulk(award, outcomes))
    return done.length === targets.length
  }

  function markFresh(key: string) {
    setFreshKeys((current) => new Set(current).add(key))
  }

  function handleAwardPoints(request: Required<AwardPointsRequest>) {
    return runBatch(
      { type: 'points', points: request.points },
      async (student) => {
        const reward = await awardPoints(group.id, student.id, request)
        setProgress((current) => {
          const known = current[student.id]
          if (known?.status !== 'ready') return current
          const balance = known.balance + reward.points
          const rank = rankForBalance(balance, config.ranks)
          return { ...current, [student.id]: { status: 'ready', balance, rank } }
        })
        updateDetail(student.id, (ready) => ({ ...ready, rewards: [reward, ...ready.rewards] }))
        markFresh(`points-${reward.id}`)
        return 'ok'
      },
      POINTS_ERRORS,
    )
  }

  async function handleAwardBadge(choice: BadgeChoice) {
    let badge = choice.kind === 'existing' ? choice.badge : null
    if (choice.kind === 'new') {
      setResult(null)
      setBusy({ done: 0, total: selected.size })
      try {
        const created = await createBadge(group.id, choice.request)
        updateBadges((catalog) => [...catalog, created])
        badge = created
      } catch (error) {
        setBusy(null)
        setResult({
          tone: 'error',
          title: 'Nie udało się utworzyć odznaki.',
          lines: [apiErrorMessage(error, CREATE_BADGE_ERRORS)],
        })
        return { allAwarded: false, badgeId: null }
      }
    }
    if (badge === null) return { allAwarded: false, badgeId: null }
    const awarded = badge
    const allAwarded = await runBatch(
      { type: 'badge', badgeName: awarded.name },
      async (student) => {
        try {
          const award = await awardBadge(group.id, student.id, awarded.id)
          updateDetail(student.id, (ready) => ({ ...ready, badges: [award, ...ready.badges] }))
          markFresh(`badge-${award.id}`)
          return 'ok'
        } catch (error) {
          if (error instanceof ApiError && error.status === 409) return 'duplicate'
          throw error
        }
      },
      BADGE_ERRORS,
    )
    return { allAwarded, badgeId: awarded.id }
  }

  async function confirmRevoke() {
    if (pendingRevoke === null) return
    const award = pendingRevoke
    setRevoking(true)
    setRevokeError(null)
    try {
      await revokeBadge(group.id, award.studentId, award.id)
      updateDetail(award.studentId, (ready) => ({
        ...ready,
        badges: ready.badges.filter((item) => item.id !== award.id),
      }))
      setRevoked({ studentId: award.studentId, text: `Cofnięto odznakę „${award.badge.name}”.` })
      setPendingRevoke(null)
      // The button is gone: once the dialog is closed, focus the same student's badges heading.
      focusAfterRevoke.current = `award-detail-${award.studentId}-badges`
    } catch (error) {
      setRevokeError(
        apiErrorMessage(error, { 404: 'Tej odznaki już nie ma albo osoba opuściła grupę.' }),
      )
    } finally {
      setRevoking(false)
    }
  }

  const recipients = students
    .filter((student) => selected.has(student.id))
    .map((student) => student.displayName)
  const revokeStudent = students.find((student) => student.id === pendingRevoke?.studentId)

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <StudentList
        students={students}
        progress={progress}
        currency={currency}
        selected={selected}
        onSelect={select}
        openId={openId}
        onOpen={toggleOpen}
        onRetryProgress={retryProgress}
        detail={(student, id) => (
          <StudentDetail
            id={id}
            student={student}
            progress={progress[student.id] ?? { status: 'loading' }}
            detail={details[student.id] ?? { status: 'loading' }}
            currency={currency}
            ranks={config.ranks}
            currentUserId={currentUserId}
            freshKeys={freshKeys}
            revoked={revoked?.studentId === student.id ? revoked.text : null}
            onRetry={() => void loadDetail(student.id)}
            onRevoke={(award) => {
              setRevokeError(null)
              setPendingRevoke(award)
            }}
          />
        )}
      />

      <AwardPanel
        currency={currency}
        recipients={recipients}
        badges={badges}
        onReloadBadges={reloadBadges}
        busy={busy}
        result={result}
        onDismissResult={() => setResult(null)}
        onAwardPoints={handleAwardPoints}
        onAwardBadge={handleAwardBadge}
      />

      <BlaskConfirmDialog
        open={pendingRevoke !== null}
        title="Cofnąć odznakę?"
        confirmLabel="Cofnij odznakę"
        busyLabel="Cofanie…"
        busy={revoking}
        error={revokeError}
        onConfirm={confirmRevoke}
        onClose={() => {
          setPendingRevoke(null)
          const target = focusAfterRevoke.current
          focusAfterRevoke.current = null
          if (target !== null) document.getElementById(target)?.focus()
        }}
      >
        {pendingRevoke !== null && (
          <p>
            <strong className="font-semibold text-blask-ink">
              {revokeStudent?.displayName ?? 'Ta osoba'}
            </strong>{' '}
            straci odznakę „{pendingRevoke.badge.name}”. Zniknie ona z listy odznak i z historii
            nagród. W razie potrzeby możesz przyznać ją ponownie.
          </p>
        )}
      </BlaskConfirmDialog>
    </div>
  )
}
