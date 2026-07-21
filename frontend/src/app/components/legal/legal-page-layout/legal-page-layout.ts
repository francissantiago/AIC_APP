import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageSwitcher } from '@components/layout/language-switcher/language-switcher';

@Component({
  selector: 'app-legal-page-layout',
  imports: [RouterLink, TranslatePipe, LanguageSwitcher],
  templateUrl: './legal-page-layout.html',
  styleUrl: './legal-page-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalPageLayout {
  readonly pageTitle = input.required<string>();
  readonly lastUpdated = input<string>('2026-07-21');
}
