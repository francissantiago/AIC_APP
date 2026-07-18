export interface ISmallGroupFrequencyMember {
  memberId: string;
  memberFullName: string;
  presentCount: number;
  absentCount: number;
  frequencyPct: number;
}

export interface ISmallGroupFrequencyReport {
  smallGroupId: string;
  smallGroupName: string;
  from: string;
  to: string;
  meetingsCount: number;
  members: ISmallGroupFrequencyMember[];
  groupAveragePct: number;
}

export interface IQuerySmallGroupFrequency {
  from: string;
  to: string;
}
