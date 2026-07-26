import { Pipe, PipeTransform, inject } from '@angular/core';
import { DateDisplayService } from '@services/date-display-service';
import { I18nService } from '@services/i18n-service';

@Pipe({
  name: 'appMonthYear',
  pure: false,
})
export class AppMonthYearPipe implements PipeTransform {
  readonly #dates = inject(DateDisplayService);
  readonly #i18n = inject(I18nService);

  transform(value: string | null | undefined): string {
    this.#i18n.currentLang();
    if (!value) {
      return '';
    }
    return this.#dates.formatMonthYear(value);
  }
}
