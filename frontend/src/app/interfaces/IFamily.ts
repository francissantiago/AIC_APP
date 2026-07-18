/** Espelha FamilyResponseDto do backend. */
export interface IFamily {
  id: string;
  congregationId: string;
  name: string;
  notes: string | null;
  headMemberId: string | null;
  headMemberName: string | null;
  membersCount?: number;
  createdAt: string;
  updatedAt: string;
}
