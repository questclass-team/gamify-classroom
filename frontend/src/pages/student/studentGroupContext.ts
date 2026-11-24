import { useOutletContext } from 'react-router'
import type { MyGroup } from '../../api/types'

/** Passed by StudentGroupLayout to its tabs through <Outlet context>. */
export interface StudentGroupOutletContext {
  group: MyGroup
}

export function useStudentGroup(): StudentGroupOutletContext {
  return useOutletContext<StudentGroupOutletContext>()
}
