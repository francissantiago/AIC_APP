export interface ISocialProjectSessionQuery {
  page?: number;
  limit?: number;
  socialProjectId?: string;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
}
