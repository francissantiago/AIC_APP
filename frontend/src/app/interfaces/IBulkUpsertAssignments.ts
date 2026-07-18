/** Espelha BulkUpsertAssignmentsDto / BulkUpsertAssignmentItemDto. */
export interface IBulkUpsertAssignmentItem {
  memberId: string;
  roleLabel: string;
  confirmed?: boolean;
  notes?: string | null;
}

export interface IBulkUpsertAssignments {
  items: IBulkUpsertAssignmentItem[];
}
