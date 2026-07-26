import {
  buildBirthdayBoardBody,
  buildBirthdayBoardExpiresAt,
  formatBirthdayLabel,
} from './birthday-board.util';

describe('birthday-board.util', () => {
  describe('formatBirthdayLabel', () => {
    it('deve manter ISO date-only para formatação no frontend', () => {
      expect(formatBirthdayLabel('1945-07-19')).toBe('1945-07-19');
    });
  });

  describe('buildBirthdayBoardBody', () => {
    it('deve montar corpo para um aniversariante', () => {
      expect(
        buildBirthdayBoardBody([
          { fullName: 'Juliana Bezerra Facre', birthDate: '1945-07-19' },
        ]),
      ).toBe('Juliana Bezerra Facre (1945-07-19)');
    });

    it('deve montar corpo para vários aniversariantes', () => {
      expect(
        buildBirthdayBoardBody([
          { fullName: 'Ana', birthDate: '1990-07-19' },
          { fullName: 'Bruno', birthDate: '1988-07-19' },
        ]),
      ).toBe('• Ana (1990-07-19)\n• Bruno (1988-07-19)');
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
