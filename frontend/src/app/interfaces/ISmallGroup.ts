import { SmallGroupStatus } from '@enums/small-group-status';

export interface ISmallGroupLeaderSummary {
  id: string;
  fullName: string;
}

/** Espelha SmallGroupResponseDto do backend. */
export interface ISmallGroup {
  id: string;
  congregationId: string;
  name: string;
  description: string | null;
  leaderMemberId: string | null;
  leader: ISmallGroupLeaderSummary | null;
  address: string | null;
  dayOfWeek: number;
  startTime: string | null;
  status: SmallGroupStatus;
  membersCount?: number;
  createdAt: string;
  updatedAt: string;
}
