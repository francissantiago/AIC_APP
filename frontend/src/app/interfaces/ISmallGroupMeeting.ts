/** Espelha SmallGroupMeetingResponseDto do backend. */
export interface ISmallGroupMeeting {
  id: string;
  smallGroupId: string;
  meetingDate: string;
  theme: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
