export function e2eSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function e2eUsername(prefix = 'e2e'): string {
  return `${prefix}-${e2eSuffix()}`.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 50);
}

export function e2eEmail(username: string): string {
  return `${username}@example.test`;
}

export function e2eRoleCode(prefix = 'E2E'): string {
  const raw = `${prefix}${e2eSuffix()}`.replace(/[^A-Za-z0-9_]/g, '_').toUpperCase();
  return raw.slice(0, 30);
}

export function e2eMemberName(prefix = 'E2E Membro'): string {
  return `${prefix} ${e2eSuffix()}`;
}

export function e2eFamilyName(prefix = 'E2E Família'): string {
  return `${prefix} ${e2eSuffix()}`;
}

export function e2eMinistryName(prefix = 'E2E Ministério'): string {
  return `${prefix} ${e2eSuffix()}`;
}

export function e2eClassName(prefix = 'E2E Classe'): string {
  return `${prefix} ${e2eSuffix()}`;
}

export function e2eSmallGroupName(prefix = 'E2E Célula'): string {
  return `${prefix} ${e2eSuffix()}`;
}

export function e2eCongregationBranchName(prefix = 'E2E Filial'): string {
  return `${prefix} ${e2eSuffix()}`;
}

export function e2eFinanceEntryDescription(prefix = 'E2E Lançamento'): string {
  return `${prefix} ${e2eSuffix()}`;
}

export function e2eFinanceCategoryName(prefix = 'E2E Categoria'): string {
  return `${prefix} ${e2eSuffix()}`;
}

export function e2eAssetName(prefix = 'E2E Bem'): string {
  return `${prefix} ${e2eSuffix()}`;
}

export function e2eVisitorName(prefix = 'E2E Visitante'): string {
  return `${prefix} ${e2eSuffix()}`;
}

export function e2eCalendarEventTitle(prefix = 'E2E Evento'): string {
  return `${prefix} ${e2eSuffix()}`;
}

export function e2eDocumentTitle(prefix = 'E2E Documento'): string {
  return `${prefix} ${e2eSuffix()}`;
}

export function e2eAnnouncementTitle(prefix = 'E2E Aviso'): string {
  return `${prefix} ${e2eSuffix()}`;
}

export function localDateTimeInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function currentWeekRange(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return {
    from: monday.toISOString().slice(0, 10),
    to: sunday.toISOString(),
  };
}

export function eventInCurrentWeek(): { startsAt: string; endsAt: string } {
  const start = new Date();
  start.setHours(19, 0, 0, 0);
  if (start.getTime() <= Date.now()) {
    start.setDate(start.getDate() + 1);
  }
  const end = new Date(start);
  end.setHours(21, 0, 0, 0);
  return {
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
  };
}

export function eventCrossMidnightInCurrentWeek(): {
  startsAt: string;
  endsAt: string;
  formStartsAt: string;
  formEndsAt: string;
} {
  const start = new Date();
  start.setHours(22, 0, 0, 0);
  if (start.getTime() <= Date.now()) {
    start.setDate(start.getDate() + 1);
  }
  const end = new Date(start);
  end.setHours(2, 0, 0, 0);
  return {
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    formStartsAt: localDateTimeInput(start),
    formEndsAt: localDateTimeInput(end),
  };
}

export function eventEarlyMorningInCurrentWeek(): {
  startsAt: string;
  endsAt: string;
  formStartsAt: string;
  formEndsAt: string;
} {
  const start = new Date();
  start.setHours(3, 0, 0, 0);
  if (start.getTime() <= Date.now()) {
    start.setDate(start.getDate() + 1);
  }
  const end = new Date(start);
  end.setHours(5, 0, 0, 0);
  return {
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    formStartsAt: localDateTimeInput(start),
    formEndsAt: localDateTimeInput(end),
  };
}

export function todayIsoDate(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

export function monthRangeIsoDate(): { from: string; to: string } {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(year, today.getMonth() + 1, 0).getDate();
  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
  };
}

export function todayBirthDateIso(referenceYear = 1990): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${referenceYear}-${month}-${day}`;
}

export function currentYearCalendarRange(): { from: string; to: string } {
  const year = new Date().getFullYear();
  return {
    from: `${year}-01-01T00:00:00.000Z`,
    to: `${year}-12-31T23:59:59.999Z`,
  };
}
