/** Espelha SocialProjectAttendanceResponseDto do backend. */
export interface ISocialProjectAttendanceEntry {
  memberId: string;
  memberFullName: string;
  attendanceId: string | null;
  present: boolean | null;
  notes: string | null;
}

export interface ISocialProjectAttendance {
  socialProjectId: string;
  socialProjectName: string;
  sessionId: string;
  sessionDate: string;
  sessionTitle: string;
  entries: ISocialProjectAttendanceEntry[];
}

export interface IUpsertSocialProjectAttendanceEntry {
  memberId: string;
  present: boolean;
  notes?: string | null;
}

export interface IUpsertSocialProjectAttendance {
  entries: IUpsertSocialProjectAttendanceEntry[];
}
