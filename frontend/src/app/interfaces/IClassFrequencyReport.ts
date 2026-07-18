import { IClassFrequencyMember } from '@interfaces/IClassFrequencyMember';

/** Espelha ClassFrequencyReportDto do backend. */
export interface IClassFrequencyReport {
  classId: string;
  className: string;
  from: string;
  to: string;
  sessionsCount: number;
  members: IClassFrequencyMember[];
  classAveragePct: number;
}
