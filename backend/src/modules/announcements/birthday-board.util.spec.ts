import {
  buildBirthdayBoardBody,
  buildBirthdayBoardExpiresAt,
  formatBirthdayLabel,
} from './birthday-board.util';

describe('birthday-board.util', () => {
  describe('formatBirthdayLabel', () => {
    it('deve formatar dia/mês a partir de ISO date', () => {
      expect(formatBirthdayLabel('1945-07-19')).toBe('19/07');
    });
  });

  describe('buildBirthdayBoardBody', () => {
    it('deve montar corpo para um aniversariante', () => {
      expect(
        buildBirthdayBoardBody([
          { fullName: 'Juliana Bezerra Facre', birthDate: '1945-07-19' },
        ]),
      ).toBe('Juliana Bezerra Facre faz aniversário hoje (19/07).');
    });

    it('deve montar corpo para vários aniversariantes', () => {
      expect(
        buildBirthdayBoardBody([
          { fullName: 'Ana', birthDate: '1990-07-19' },
          { fullName: 'Bruno', birthDate: '1988-07-19' },
        ]),
      ).toBe('Hoje celebramos aniversário de:\n• Ana (19/07)\n• Bruno (19/07)');
    });
  });

  describe('buildBirthdayBoardExpiresAt', () => {
    it('deve expirar no início do dia seguinte', () => {
      jest.useFakeTimers({ now: new Date('2026-07-19T08:00:00-03:00') });
      const expiresAt = buildBirthdayBoardExpiresAt(new Date());
      expect(expiresAt.getFullYear()).toBe(2026);
      expect(expiresAt.getMonth()).toBe(6);
      expect(expiresAt.getDate()).toBe(20);
      expect(expiresAt.getHours()).toBe(0);
      jest.useRealTimers();
    });
  });
});
