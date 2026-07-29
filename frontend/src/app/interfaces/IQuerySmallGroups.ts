import { SmallGroupStatus } from '@enums/small-group-status';
import { ReportScope } from '@enums/report-scope';

export interface IQuerySmallGroups {
  page?: number;
  limit?: number;
  q?: string;
  status?: SmallGroupStatus;
  scope?: ReportScope;
}
