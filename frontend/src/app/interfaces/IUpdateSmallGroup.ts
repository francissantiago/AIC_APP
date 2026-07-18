import { SmallGroupStatus } from '@enums/small-group-status';

export interface IUpdateSmallGroup {
  name?: string;
  description?: string | null;
  leaderMemberId?: string | null;
  address?: string | null;
  dayOfWeek?: number;
  startTime?: string | null;
  status?: SmallGroupStatus;
}
