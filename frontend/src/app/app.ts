import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageSwitcher } from '@components/language-switcher/language-switcher';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LanguageSwitcher],
  template: `
    <header class="app-header">
      <app-language-switcher />
    </header>
    <router-outlet />
  `,
  styles: `
    .app-header {
      display: flex;
      justify-content: flex-end;
      padding: 0.75rem 1rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
