import { ConstructionProjectStatus } from '@enums/construction-project-status';
import { IConstructionProject } from '@interfaces/IConstructionProject';

export interface ICreateConstructionProject {
  name: string;
  description?: string;
  location?: string;
  status?: ConstructionProjectStatus;
  budgetAmount?: number;
  startDate?: string;
  expectedEndDate?: string;
  actualEndDate?: string;
  supervisorMemberId?: string;
}

export interface IUpdateConstructionProject {
  name?: string;
  description?: string | null;
  location?: string | null;
  status?: ConstructionProjectStatus;
  budgetAmount?: number | null;
  startDate?: string | null;
  expectedEndDate?: string | null;
  actualEndDate?: string | null;
  supervisorMemberId?: string | null;
}

export interface IQueryConstructionProjects {
  page?: number;
  limit?: number;
  q?: string;
  status?: ConstructionProjectStatus;
}

export interface IPaginatedConstructionProjects {
  data: IConstructionProject[];
  total: number;
  page: number;
  limit: number;
}
