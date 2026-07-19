export const BIRTHDAY_BOARD_TITLE = 'Aniversariantes do dia';

export interface BirthdayBoardMember {
  fullName: string;
  birthDate: string;
}

export function formatBirthdayLabel(birthDate: string): string {
  const day = birthDate.slice(8, 10);
  const month = birthDate.slice(5, 7);
  return `${day}/${month}`;
}

export function buildBirthdayBoardBody(members: BirthdayBoardMember[]): string {
  if (members.length === 1) {
    const member = members[0];
    return `${member.fullName} faz aniversário hoje (${formatBirthdayLabel(member.birthDate)}).`;
  }

  const lines = members.map(
    (member) =>
      `• ${member.fullName} (${formatBirthdayLabel(member.birthDate)})`,
  );
  return `Hoje celebramos aniversário de:\n${lines.join('\n')}`;
}

export function buildBirthdayBoardExpiresAt(from: Date = new Date()): Date {
  const expiresAt = new Date(from);
  expiresAt.setHours(0, 0, 0, 0);
  expiresAt.setDate(expiresAt.getDate() + 1);
  return expiresAt;
}
