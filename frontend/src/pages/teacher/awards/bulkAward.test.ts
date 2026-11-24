import { describe, expect, it } from 'vitest'
import { filterStudents, namesList, summarizeBulk } from './bulkAward'

describe('namesList', () => {
  it('joins up to three names and counts the rest', () => {
    expect(namesList(['Ewa Nowak'])).toBe('Ewa Nowak')
    expect(namesList(['Ewa', 'Piotr'])).toBe('Ewa i Piotr')
    expect(namesList(['Ewa', 'Piotr', 'Julia'])).toBe('Ewa, Piotr i Julia')
    expect(namesList(['Ewa', 'Piotr', 'Julia', 'Zofia'])).toBe('Ewa, Piotr i 2 inne osoby')
    expect(namesList(['A', 'B', 'C', 'D', 'E', 'F', 'G'])).toBe('A, B i 5 innych osób')
  })
})

describe('summarizeBulk', () => {
  const points = { type: 'points', points: 20 } as const
  const badge = { type: 'badge', badgeName: 'Pomocna dłoń' } as const

  it('names everyone when all went through', () => {
    expect(
      summarizeBulk(points, [
        { name: 'Ewa Nowak', status: 'ok' },
        { name: 'Piotr Zieliński', status: 'ok' },
        { name: 'Julia Woźniak', status: 'ok' },
      ]),
    ).toEqual({
      tone: 'success',
      title: 'Przyznano +20: Ewa Nowak, Piotr Zieliński i Julia Woźniak.',
      lines: [],
    })
  })

  it('names each failure with its reason', () => {
    expect(
      summarizeBulk(points, [
        { name: 'Ewa Nowak', status: 'ok' },
        { name: 'Piotr Zieliński', status: 'failed', error: 'Saldo przekroczyłoby limit.' },
        { name: 'Julia Woźniak', status: 'ok' },
      ]),
    ).toEqual({
      tone: 'partial',
      title: 'Przyznano +20 dla 2 z 3 osób: Ewa Nowak i Julia Woźniak.',
      lines: ['Nie udało się: Piotr Zieliński. Saldo przekroczyłoby limit.'],
    })
  })

  it('treats "already has it" as information, not an error', () => {
    expect(
      summarizeBulk(badge, [
        { name: 'Ewa Nowak', status: 'ok' },
        { name: 'Julia Woźniak', status: 'duplicate' },
      ]),
    ).toEqual({
      tone: 'success',
      title: 'Przyznano odznakę „Pomocna dłoń”: Ewa Nowak.',
      lines: ['Już ma tę odznakę: Julia Woźniak.'],
    })
    expect(
      summarizeBulk(badge, [
        { name: 'Ewa Nowak', status: 'duplicate' },
        { name: 'Julia Woźniak', status: 'duplicate' },
      ]),
    ).toEqual({
      tone: 'info',
      title: 'Ewa Nowak i Julia Woźniak mają już odznakę „Pomocna dłoń”.',
      lines: [],
    })
  })

  it('reports a batch where nobody got the award', () => {
    expect(
      summarizeBulk(badge, [
        { name: 'Ewa Nowak', status: 'duplicate' },
        { name: 'Julia Woźniak', status: 'failed', error: 'Brak połączenia.' },
      ]),
    ).toEqual({
      tone: 'partial',
      title: 'Nikt nie dostał odznaki „Pomocna dłoń”.',
      lines: ['Już ma tę odznakę: Ewa Nowak.', 'Nie udało się: Julia Woźniak. Brak połączenia.'],
    })
    expect(
      summarizeBulk(points, [{ name: 'Ewa Nowak', status: 'failed', error: 'Brak połączenia.' }]),
    ).toEqual({
      tone: 'error',
      title: 'Nie udało się przyznać: +20.',
      lines: ['Nie udało się: Ewa Nowak. Brak połączenia.'],
    })
  })
})

describe('filterStudents', () => {
  const students = [
    { displayName: 'Katarzyna Wójcik', login: 'kwojcik' },
    { displayName: 'Michał Szymański', login: 'mszymanski' },
  ]

  it('matches name or login, ignoring case and Polish letters', () => {
    expect(filterStudents(students, 'WÓJ')).toEqual([students[0]])
    expect(filterStudents(students, 'michal')).toEqual([students[1]])
    expect(filterStudents(students, 'mszym')).toEqual([students[1]])
    expect(filterStudents(students, '  ')).toEqual(students)
    expect(filterStudents(students, 'xyz')).toEqual([])
  })
})
