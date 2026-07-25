/** Espelha ConstructionUpdateResponseDto do backend. */
export interface IConstructionUpdate {
  id: string;
  congregationId: string;
  constructionProjectId: string;
  projectName: string | null;
  title: string;
  description: string | null;
  progressPercent: number | null;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
}
