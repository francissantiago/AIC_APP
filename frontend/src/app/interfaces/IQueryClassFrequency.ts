import { ReportScope } from '@enums/report-scope';

/** Espelha QueryClassFrequencyDto do backend. */
export interface IQueryClassFrequency {
  from: string;
  to: string;
  scope?: ReportScope;
}
