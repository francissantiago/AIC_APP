import {
  formatDateForLocale,
  formatIsoDatesInTextForLocale,
  formatMonthYearForLocale,
  formatTimeForLocale,
  joinDatetimeLocal,
  parseFlexibleDateInput,
  parseFlexibleDatetimeInput,
  parseFlexibleTimeInput,
  parseIsoDateOnly,
  splitDatetimeLocal,
  toIsoDateOnly,
} from '@utils/date-display.util';

describe('date-display.util', () => {
  it('formata date-only sem deslocamento de timezone', () => {
    const parsed = parseIsoDateOnly('1945-07-19');
    expect(parsed?.getDate()).toBe(19);
    expect(parsed?.getMonth()).toBe(6);
    expect(formatDateForLocale('1945-07-19', 'pt-BR', 'date')).toMatch(/19\/07\/1945/);
  });

  it('formata mês/ano por locale', () => {
    expect(formatMonthYearForLocale('2026-07', 'pt-BR')).toMatch(/2026/);
    expect(formatMonthYearForLocale('2026-07', 'en')).toMatch(/2026/);
  });

  it('formata hora removendo segundos', () => {
    expect(formatTimeForLocale('09:00:00', 'pt-BR')).toMatch(/09:00/);
  });

  it('substitui ISO em textos legados', () => {
    const text = 'Maria Silva (1945-07-19)';
    const formatted = formatIsoDatesInTextForLocale(text, 'pt-BR');
    expect(formatted).not.toContain('1945-07-19');
    expect(formatted).toContain('19/07/1945');
  });

  it('parseFlexibleDateInput aceita ISO e dd/mm/yyyy', () => {
    expect(parseFlexibleDateInput('1945-07-19', 'pt-BR')).toBe('1945-07-19');
    expect(parseFlexibleDateInput('19/07/1945', 'pt-BR')).toBe('1945-07-19');
    expect(parseFlexibleDateInput('07/19/1945', 'en')).toBe('1945-07-19');
  });

  it('parseFlexibleTimeInput normaliza hora', () => {
    expect(parseFlexibleTimeInput('9:5')).toBe('09:05');
    expect(parseFlexibleTimeInput('09:00:00')).toBe('09:00');
  });

  it('parseFlexibleDatetimeInput combina data e hora', () => {
    expect(parseFlexibleDatetimeInput('2026-07-30T14:30', 'pt-BR')).toBe('2026-07-30T14:30');
    expect(parseFlexibleDatetimeInput('30/07/2026 14:30', 'pt-BR')).toBe('2026-07-30T14:30');
  });

  it('splitDatetimeLocal e joinDatetimeLocal são inversos', () => {
    const joined = joinDatetimeLocal('2026-07-30', '14:30');
    expect(splitDatetimeLocal(joined)).toEqual({ date: '2026-07-30', time: '14:30' });
  });

  it('toIsoDateOnly retorna yyyy-MM-dd', () => {
    expect(toIsoDateOnly(new Date(2026, 6, 30, 12, 0, 0, 0))).toBe('2026-07-30');
  });
});
