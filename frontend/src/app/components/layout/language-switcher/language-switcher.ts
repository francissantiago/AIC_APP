import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AppLanguage } from '@enums/app-language';
import { I18nService } from '@services/i18n-service';

@Component({
  selector: 'app-language-switcher',
  imports: [TranslatePipe],
  templateUrl: './language-switcher.html',
  styleUrl: './language-switcher.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSwitcher {
  protected readonly i18n = inject(I18nService);

  protected onLanguageChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.i18n.setLanguage(select.value as AppLanguage);
  }
}
