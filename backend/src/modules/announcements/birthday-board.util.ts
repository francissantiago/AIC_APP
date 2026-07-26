export const BIRTHDAY_BOARD_TITLE = 'Aniversariantes do dia';

export interface BirthdayBoardMember {
  fullName: string;
  birthDate: string;
}

/** ISO date-only label kept in stored text; frontend localizes on display. */
export function formatBirthdayLabel(birthDate: string): string {
  return birthDate;
}

export function buildBirthdayBoardBody(members: BirthdayBoardMember[]): string {
  if (members.length === 1) {
    const member = members[0];
    return `${member.fullName} (${formatBirthdayLabel(member.birthDate)})`;
  }

  const lines = members.map(
    (member) =>
      `• ${member.fullName} (${formatBirthdayLabel(member.birthDate)})`,
  );
  return lines.join('\n');
}

export function buildBirthdayBoardExpiresAt(from: Date = new Date()): Date {
  const expiresAt = new Date(from);
  expiresAt.setHours(0, 0, 0, 0);
  expiresAt.setDate(expiresAt.getDate() + 1);
  return expiresAt;
}
