import { useEffect, useMemo, useRef, useState } from 'react'
import { apiErrorMessage } from '../../api/errorMessage'
import { addGroupStudent, removeGroupStudent } from '../../api/groups'
import type { GroupStudent, StudentSummary } from '../../api/types'
import { BlaskConfirmDialog } from '../../components/blask/BlaskConfirmDialog'
import { BlaskNotice } from '../../components/blask/BlaskNotice'
import { Button } from '../../components/blask/Button'
import { Panel } from '../../components/blask/Panel'
import { EmptyState } from '../../components/blask/States'
import { Table } from '../../components/blask/Table'
import { dateFormat } from '../../format'
import { useShell } from '../../layout/shellContext'
import { useGroup } from './groupContext'
import { StudentPicker } from './StudentPicker'

const ADD_ERRORS = {
  404: 'Nie można dodać tego studenta: konto nie istnieje albo grupa nie jest Twoja.',
}

export function GroupStudentsPage() {
  const { group, updateGroup } = useGroup()
  const { notify } = useShell()
  const [addError, setAddError] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [pendingRemoval, setPendingRemoval] = useState<GroupStudent | null>(null)
  const [removing, setRemoving] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  // Row index whose remove button takes the focus once the dialog has closed.
  const refocusIndex = useRef<number | null>(null)

  // Runs after the dialog's own effect closed it (child effects first), so the native focus
  // return to the removed opener is overridden: the next row's button, or the search when the
  // list is empty.
  useEffect(() => {
    const index = refocusIndex.current
    if (index === null || pendingRemoval !== null) return
    refocusIndex.current = null
    const page = pageRef.current
    const buttons = page?.querySelectorAll<HTMLElement>('[data-remove-student]') ?? []
    const target = buttons[Math.min(index, buttons.length - 1)] ?? page?.querySelector('input')
    target?.focus()
  }, [pendingRemoval, group.students])

  const students = useMemo(
    () => group.students.toSorted((a, b) => a.displayName.localeCompare(b.displayName, 'pl')),
    [group.students],
  )
  const memberIds = useMemo(() => new Set(group.students.map((student) => student.id)), [group])

  async function handleAdd(student: StudentSummary) {
    setAddError(null)
    setAddingId(student.id)
    try {
      const added = await addGroupStudent(group.id, student.id)
      updateGroup((current) =>
        current.students.some((member) => member.id === added.id)
          ? current
          : { ...current, students: [...current.students, added] },
      )
      notify(`Dodano ${added.displayName} do grupy.`)
    } catch (error) {
      setAddError(apiErrorMessage(error, ADD_ERRORS))
    } finally {
      setAddingId(null)
    }
  }

  function askRemove(student: GroupStudent) {
    setRemoveError(null)
    setPendingRemoval(student)
  }

  async function confirmRemove() {
    if (pendingRemoval === null) return
    const student = pendingRemoval
    setRemoving(true)
    setRemoveError(null)
    try {
      await removeGroupStudent(group.id, student.id)
      updateGroup((current) => ({
        ...current,
        students: current.students.filter((member) => member.id !== student.id),
      }))
      notify(`Usunięto ${student.displayName} z grupy.`)
      refocusIndex.current = students.findIndex((member) => member.id === student.id)
      setPendingRemoval(null)
    } catch (error) {
      setRemoveError(apiErrorMessage(error))
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div ref={pageRef} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <Panel
        title="Dodaj studenta"
        className="lg:sticky lg:top-[calc(var(--blask-head-h)+1.5rem)] lg:order-last"
      >
        <div className="flex flex-col gap-4">
          <StudentPicker memberIds={memberIds} addingId={addingId} onAdd={handleAdd} />
          {addError !== null && <BlaskNotice tone="error">{addError}</BlaskNotice>}
        </div>
      </Panel>

      <Panel
        title="Studenci"
        aside={<span className="blask-num">{students.length}</span>}
        padded={false}
        className="min-w-0"
      >
        {students.length === 0 ? (
          <EmptyState title="W tej grupie nie ma jeszcze studentów" headingLevel={3} bare>
            <p>
              Wyszukaj studenta po loginie albo nazwisku w panelu „Dodaj studenta” i dodaj go do
              grupy. Konta zakłada administrator przez import.
            </p>
          </EmptyState>
        ) : (
          <Table caption={`Studenci grupy ${group.name}`}>
            <thead>
              <tr>
                <th scope="col">Imię i nazwisko</th>
                <th scope="col">Login</th>
                <th scope="col">Dodano</th>
                <th scope="col">
                  <span className="sr-only">Akcje</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td className="font-medium text-blask-ink">{student.displayName}</td>
                  <td data-label="Login">
                    <span className="font-mono text-sm">{student.login}</span>
                  </td>
                  <td data-label="Dodano" className="whitespace-nowrap text-blask-graphite">
                    {dateFormat.format(new Date(student.addedAt))}
                  </td>
                  <td data-actions>
                    <Button
                      variant="quiet"
                      size="sm"
                      data-remove-student
                      aria-label={`Usuń ${student.displayName} z grupy`}
                      onClick={() => askRemove(student)}
                    >
                      Usuń
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      <BlaskConfirmDialog
        open={pendingRemoval !== null}
        title="Usunąć studenta z grupy?"
        confirmLabel="Usuń z grupy"
        busyLabel="Usuwanie…"
        busy={removing}
        error={removeError}
        onConfirm={confirmRemove}
        onClose={() => setPendingRemoval(null)}
      >
        {pendingRemoval !== null && (
          <p>
            <strong className="font-semibold text-blask-ink">{pendingRemoval.displayName}</strong> (
            <span className="font-mono">{pendingRemoval.login}</span>) przestanie należeć do grupy „
            {group.name}”. Konto studenta pozostanie w systemie i można go dodać ponownie.
          </p>
        )}
      </BlaskConfirmDialog>
    </div>
  )
}
