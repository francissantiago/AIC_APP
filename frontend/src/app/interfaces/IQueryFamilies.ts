/** Espelha QueryFamiliesDto do backend (param `search`, não `q`). */
export interface IQueryFamilies {
  page?: number;
  limit?: number;
  search?: string;
}
