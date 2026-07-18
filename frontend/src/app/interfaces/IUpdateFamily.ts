/** Espelha UpdateFamilyDto do backend (parcial; null limpa head/notes). */
export interface IUpdateFamily {
  name?: string;
  notes?: string | null;
  headMemberId?: string | null;
}
