import { ConstructionProjectStatus } from '@enums/construction-project-status';

/** Espelha ConstructionProjectStageResponseDto do backend. */
export interface IConstructionProjectStage {
  id: string;
  congregationId: string;
  constructionProjectId: string;
  title: string;
  sortOrder: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateConstructionProjectStage {
  title: string;
}

export interface IUpdateConstructionProjectStage {
  title?: string;
  completed?: boolean;
  observation?: string;
}
