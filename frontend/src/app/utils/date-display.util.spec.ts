import { describe, expect, it } from 'vitest';
import {
  formatDateForLocale,
  formatIsoDatesInTextForLocale,
  formatMonthYearForLocale,
  formatTimeForLocale,
  parseIsoDateOnly,
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
});
