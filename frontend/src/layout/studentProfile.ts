import { createContext, useContext } from 'react'

export interface StudentProfileValue {
  /** The student's nickname; null when not set, undefined while unknown (loading or failed). */
  nickname: string | null | undefined
  /** Opens the nickname dialog; focus goes back to `returnTo` (or the account button) after it. */
  openNicknameDialog: (returnTo?: HTMLElement | null) => void
}

export const StudentProfileContext = createContext<StudentProfileValue | null>(null)

/** The signed-in student's profile, shared by the header and the student pages. */
export function useStudentProfile(): StudentProfileValue {
  const value = useContext(StudentProfileContext)
  if (value === null) throw new Error('useStudentProfile must be used inside <StudentLayout>')
  return value
}
