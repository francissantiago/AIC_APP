import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageSwitcher } from '@components/language-switcher/language-switcher';
import { AuthService } from '@services/auth-service';

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
          @if (authService.isAuthenticated()) {
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
          } @else {
            <span class="font-semibold text-slate-900">{{ 'APP.NAME' | translate }}</span>
          }
        </nav>
        <div class="flex items-center gap-3">
          @if (authService.isAuthenticated()) {
            <button
              type="button"
              class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              (click)="authService.logout()"
            >
              {{ 'AUTH.LOGOUT' | translate }}
            </button>
          }
          <app-language-switcher />
        </div>
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
export class App {
  readonly authService = inject(AuthService);
}
