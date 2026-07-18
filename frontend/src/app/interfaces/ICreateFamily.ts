/** Espelha CreateFamilyDto do backend. */
export interface ICreateFamily {
  name: string;
  notes?: string | null;
  headMemberId?: string | null;
}
