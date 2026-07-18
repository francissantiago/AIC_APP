import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { FINANCE_READ_ROLES, SECRETARIAT_READ_ROLES, hasAnyRole } from '@guards/role-guard';
import { AuthService } from '@services/auth-service';
import { filter } from 'rxjs';

export type SidebarNavItem = {
  route: string;
  labelKey: string;
  icon: 'users' | 'roles' | 'members' | 'congregation';
};

@Component({
  selector: 'app-sidebar-nav',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './sidebar-nav.html',
  styleUrl: './sidebar-nav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarNav {
  readonly #auth = inject(AuthService);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);
  readonly expanded = input(true);
  readonly currentUrl = signal(this.#router.url);
  readonly financeOpen = signal(this.#router.url.startsWith('/finance'));
  readonly secretariatOpen = signal(this.#router.url.startsWith('/secretariat'));
  readonly canViewFinance = computed(() =>
    hasAnyRole(this.#auth.currentUser()?.roles.map((role) => role.code) ?? [], FINANCE_READ_ROLES),
  );
  readonly canViewSecretariat = computed(() =>
    hasAnyRole(
      this.#auth.currentUser()?.roles.map((role) => role.code) ?? [],
      SECRETARIAT_READ_ROLES,
    ),
  );

  readonly items: readonly SidebarNavItem[] = [
    { route: '/users', labelKey: 'NAV.USERS', icon: 'users' },
    { route: '/roles', labelKey: 'NAV.ROLES', icon: 'roles' },
    { route: '/members', labelKey: 'NAV.MEMBERS', icon: 'members' },
    { route: '/congregation', labelKey: 'NAV.CONGREGATIONS', icon: 'congregation' },
  ];

  readonly financeItems = [
    { route: '/finance', labelKey: 'NAV.FINANCE_DASHBOARD' },
    { route: '/finance/entries', labelKey: 'NAV.FINANCIAL_ENTRIES' },
    { route: '/finance/assets', labelKey: 'NAV.ASSETS' },
    { route: '/finance/reports', labelKey: 'NAV.FINANCIAL_REPORTS' },
  ] as const;

  readonly secretariatItems = [
    { route: '/secretariat', labelKey: 'NAV.SECRETARIAT_DASHBOARD' },
    { route: '/secretariat/agenda', labelKey: 'NAV.SECRETARIAT_AGENDA' },
    { route: '/secretariat/visitors', labelKey: 'NAV.SECRETARIAT_VISITORS' },
    { route: '/secretariat/attendance', labelKey: 'NAV.SECRETARIAT_ATTENDANCE' },
    { route: '/secretariat/documents', labelKey: 'NAV.SECRETARIAT_DOCUMENTS' },
  ] as const;

  constructor() {
    this.#router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
        if (event.urlAfterRedirects.startsWith('/finance')) {
          this.financeOpen.set(true);
        }
        if (event.urlAfterRedirects.startsWith('/secretariat')) {
          this.secretariatOpen.set(true);
        }
      });
  }

  toggleFinance(): void {
    if (!this.expanded()) {
      void this.#router.navigateByUrl('/finance');
      return;
    }
    this.financeOpen.update((value) => !value);
  }

  toggleSecretariat(): void {
    if (!this.expanded()) {
      void this.#router.navigateByUrl('/secretariat');
      return;
    }
    this.secretariatOpen.update((value) => !value);
  }
}
