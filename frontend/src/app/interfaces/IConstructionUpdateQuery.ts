import { IConstructionUpdate } from '@interfaces/IConstructionUpdate';

export interface ICreateConstructionUpdate {
  constructionProjectId: string;
  title: string;
  description?: string;
  recordedAt: string;
}

export interface IUpdateConstructionUpdate {
  title?: string;
  description?: string | null;
  recordedAt?: string;
}

export interface IQueryConstructionUpdates {
  page?: number;
  limit?: number;
  q?: string;
  constructionProjectId?: string;
}

export interface IPaginatedConstructionUpdates {
  data: IConstructionUpdate[];
  total: number;
  page: number;
  limit: number;
}
