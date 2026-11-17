import { useOutletContext } from 'react-router'
import type { GroupDetail } from '../../api/types'

/** Shared by the group page tabs: the group loaded once by GroupLayout. */
export interface GroupOutletContext {
  group: GroupDetail
  /** Applies a local change after a successful mutation, without refetching. */
  updateGroup: (change: (group: GroupDetail) => GroupDetail) => void
}

export function useGroup(): GroupOutletContext {
  return useOutletContext<GroupOutletContext>()
}
