import { inject, Injectable } from '@angular/core';
import {
  DateDisplayPreset,
  formatDateForLocale,
  formatIsoDatesInTextForLocale,
  formatMonthYearForLocale,
  formatTimeForLocale,
  parseDisplayDate,
  parseIsoDateOnly,
} from '@utils/date-display.util';
import { I18nService } from '@services/i18n-service';

export type { DateDisplayPreset };

@Injectable({
  providedIn: 'root',
})
export class DateDisplayService {
  readonly #i18n = inject(I18nService);

  format(
    value: string | Date | null | undefined,
    preset: DateDisplayPreset = 'date',
  ): string {
    return formatDateForLocale(value, this.#locale(), preset);
  }

  formatMonthYear(isoMonth: string): string {
    return formatMonthYearForLocale(isoMonth, this.#locale());
  }

  formatTime(value: string): string {
    return formatTimeForLocale(value, this.#locale());
  }

  formatIsoDatesInText(text: string): string {
    return formatIsoDatesInTextForLocale(text, this.#locale());
  }

  parseIsoDateOnly(value: string): Date | null {
    return parseIsoDateOnly(value);
  }

  parse(value: string | Date): Date | null {
    return parseDisplayDate(value);
  }

  #locale(): string {
    return this.#i18n.currentLang();
  }
}
