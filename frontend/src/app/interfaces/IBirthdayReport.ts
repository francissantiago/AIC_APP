import { IBirthdayReportItem } from '@interfaces/IBirthdayReportItem';

/** Espelha BirthdayReportResponseDto do backend. */
export interface IBirthdayReport {
  data: IBirthdayReportItem[];
}
