import { SmallGroupStatus } from '@enums/small-group-status';

export interface ICreateSmallGroup {
  name: string;
  description?: string;
  leaderMemberId?: string | null;
  address?: string;
  dayOfWeek?: number;
  startTime?: string;
  status?: SmallGroupStatus;
}
