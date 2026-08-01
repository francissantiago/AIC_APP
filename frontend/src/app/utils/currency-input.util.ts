const NON_DIGIT = /\D/g;

export function parseCurrencyInput(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const digits = trimmed.replace(NON_DIGIT, '');
  if (!digits) {
    return null;
  }

  const value = Number(digits) / 100;
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.round(value * 100) / 100;
}

export function formatCurrencyInput(
  value: number | null | undefined,
  locale = 'pt-BR',
  currency = 'BRL',
): string {
  if (value == null || !Number.isFinite(value)) {
    return '';
  }

  return value.toLocaleString(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function maskCurrencyDigits(raw: string): string {
  const digits = raw.replace(NON_DIGIT, '').slice(0, 15);
  if (!digits) {
    return '';
  }

  const cents = Number(digits);
  return formatCurrencyInput(cents / 100);
}
