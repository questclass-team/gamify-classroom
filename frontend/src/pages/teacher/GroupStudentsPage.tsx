import { useMemo, useState } from 'react'
import { apiErrorMessage } from '../../api/errorMessage'
import { addGroupStudent, removeGroupStudent } from '../../api/groups'
import type { GroupStudent, StudentSummary } from '../../api/types'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Alert, Button, Panel, SectionTitle, Table } from '../../components/ui'
import { dateFormat } from '../../format'
import { useGroup } from './groupContext'
import { StudentPicker } from './StudentPicker'

const ADD_ERRORS = {
  404: 'Nie można dodać tego studenta: konto nie istnieje albo grupa nie jest Twoja.',
}

type Notice = { tone: 'success' | 'error'; text: string }

export function GroupStudentsPage() {
  const { group, updateGroup } = useGroup()
  const [notice, setNotice] = useState<Notice | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [pendingRemoval, setPendingRemoval] = useState<GroupStudent | null>(null)
  const [removing, setRemoving] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)

  const students = useMemo(
    () => group.students.toSorted((a, b) => a.displayName.localeCompare(b.displayName, 'pl')),
    [group.students],
  )
  const memberIds = useMemo(() => new Set(group.students.map((student) => student.id)), [group])

  async function handleAdd(student: StudentSummary) {
    setNotice(null)
    setAddingId(student.id)
    try {
      const added = await addGroupStudent(group.id, student.id)
      updateGroup((current) =>
        current.students.some((member) => member.id === added.id)
          ? current
          : { ...current, students: [...current.students, added] },
      )
      setNotice({ tone: 'success', text: `Dodano ${added.displayName} do grupy.` })
    } catch (error) {
      setNotice({ tone: 'error', text: apiErrorMessage(error, ADD_ERRORS) })
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
      setNotice({ tone: 'success', text: `Usunięto ${student.displayName} z grupy.` })
      setPendingRemoval(null)
    } catch (error) {
      setRemoveError(apiErrorMessage(error))
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Panel aria-labelledby="add-student-heading" className="lg:sticky lg:top-6 lg:order-last">
        <SectionTitle id="add-student-heading">Dodaj studenta</SectionTitle>
        <StudentPicker memberIds={memberIds} addingId={addingId} onAdd={handleAdd} />
      </Panel>

      <div className="flex min-w-0 flex-col gap-4">
        {notice !== null && <Alert tone={notice.tone}>{notice.text}</Alert>}

        {students.length === 0 ? (
          <Alert tone="info">
            W tej grupie nie ma jeszcze studentów. Wyszukaj studenta i dodaj go do grupy.
          </Alert>
        ) : (
          <Table caption={`Studenci (${students.length})`}>
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
                  <td className="font-medium">{student.displayName}</td>
                  <td data-label="Login" className="font-mono">
                    {student.login}
                  </td>
                  <td data-label="Dodano" className="whitespace-nowrap text-muted">
                    {dateFormat.format(new Date(student.addedAt))}
                  </td>
                  <td data-actions>
                    <Button
                      size="sm"
                      variant="secondary"
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
      </div>

      <ConfirmDialog
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
            <strong className="font-semibold text-fg">{pendingRemoval.displayName}</strong> (
            <span className="font-mono">{pendingRemoval.login}</span>) przestanie należeć do grupy „
            {group.name}”. Konto studenta pozostanie w systemie i można go dodać ponownie.
          </p>
        )}
      </ConfirmDialog>
    </div>
  )
}
