/** Espelha ConstructionPhotoResponseDto do backend. */
export interface IConstructionPhoto {
  id: string;
  congregationId: string;
  constructionProjectId: string;
  constructionUpdateId: string | null;
  uploadedByUserId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  caption: string | null;
  contentUrl: string;
  createdAt: string;
  updatedAt: string;
}
