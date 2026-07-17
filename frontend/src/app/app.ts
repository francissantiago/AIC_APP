import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageSwitcher } from '@components/language-switcher/language-switcher';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LanguageSwitcher, TranslatePipe],
  template: `
    <header class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <nav
          class="flex flex-wrap items-center gap-4 text-sm"
          [attr.aria-label]="'APP.NAME' | translate"
        >
          <a
            routerLink="/users"
            routerLinkActive="font-semibold text-slate-900"
            class="text-slate-600 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            {{ 'USERS.TITLE' | translate }}
          </a>
          <a
            routerLink="/roles"
            routerLinkActive="font-semibold text-slate-900"
            class="text-slate-600 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            {{ 'ROLES.TITLE' | translate }}
          </a>
        </nav>
        <app-language-switcher />
      </div>
    </header>
    <main>
      <router-outlet />
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      background: #f8fafc;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
