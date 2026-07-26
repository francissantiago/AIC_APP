/** Espelha SocialProjectSessionResponseDto do backend. */
export interface ISocialProjectSession {
  id: string;
  congregationId: string;
  socialProjectId: string;
  socialProjectName: string | null;
  sessionDate: string;
  title: string;
  theme: string | null;
  notes: string | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateSocialProjectSession {
  sessionDate: string;
  title: string;
  theme?: string;
  notes?: string;
  location?: string;
}

export interface IUpdateSocialProjectSession {
  sessionDate?: string;
  title?: string;
  theme?: string | null;
  notes?: string | null;
  location?: string | null;
}

export interface IPaginatedSocialProjectSessions {
  data: ISocialProjectSession[];
  total: number;
  page: number;
  limit: number;
}
