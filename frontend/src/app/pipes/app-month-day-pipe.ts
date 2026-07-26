import { Pipe, PipeTransform, inject } from '@angular/core';
import { DateDisplayService } from '@services/date-display-service';
import { I18nService } from '@services/i18n-service';

@Pipe({
  name: 'appMonthDay',
  pure: false,
})
export class AppMonthDayPipe implements PipeTransform {
  readonly #dates = inject(DateDisplayService);
  readonly #i18n = inject(I18nService);

  transform(value: string | Date | null | undefined): string {
    this.#i18n.currentLang();
    return this.#dates.format(value, 'monthDay');
  }
}
