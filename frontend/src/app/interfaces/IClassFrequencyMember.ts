/** Espelha ClassFrequencyMemberDto do backend. */
export interface IClassFrequencyMember {
  memberId: string;
  memberFullName: string;
  presentCount: number;
  absentCount: number;
  frequencyPct: number;
}
