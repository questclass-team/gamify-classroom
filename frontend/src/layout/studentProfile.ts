import { createContext, useContext } from 'react'
import type { AvatarKey } from '../api/types'

export interface StudentProfileValue {
  /** The student's nickname; null when not set, undefined while unknown (loading or failed). */
  nickname: string | null | undefined
  /** The student's avatar; null when none is chosen, undefined while unknown. */
  avatar: AvatarKey | null | undefined
  /** Opens the nickname dialog; focus goes back to `returnTo` (or the account button) after it. */
  openNicknameDialog: (returnTo?: HTMLElement | null) => void
  /** Opens the avatar picker dialog; focus returns like after the nickname dialog. */
  openAvatarDialog: (returnTo?: HTMLElement | null) => void
}

export const StudentProfileContext = createContext<StudentProfileValue | null>(null)

/** The signed-in student's profile, shared by the header and the student pages. */
export function useStudentProfile(): StudentProfileValue {
  const value = useContext(StudentProfileContext)
  if (value === null)
    throw new Error('useStudentProfile must be used inside the student <AppShell>')
  return value
}
