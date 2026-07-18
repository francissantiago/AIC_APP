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
import { AuthService } from '@services/auth-service';
import { filter } from 'rxjs';

export type SidebarNavItem = {
  route: string;
  labelKey: string;
  icon: 'users' | 'roles' | 'members' | 'congregation';
  permission: string;
};

export type SidebarFinanceItem = {
  route: string;
  labelKey: string;
  permission: string;
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

  readonly canViewFinanceSection = computed(() =>
    this.#auth.hasAnyPermission('finance:read', 'assets:read'),
  );
  readonly canViewSecretariat = computed(() => this.#auth.hasPermission('secretariat:read'));

  readonly allItems: readonly SidebarNavItem[] = [
    { route: '/users', labelKey: 'NAV.USERS', icon: 'users', permission: 'users:read' },
    { route: '/roles', labelKey: 'NAV.ROLES', icon: 'roles', permission: 'roles:read' },
    {
      route: '/members',
      labelKey: 'NAV.MEMBERS',
      icon: 'members',
      permission: 'members:read',
    },
    {
      route: '/congregation',
      labelKey: 'NAV.CONGREGATIONS',
      icon: 'congregation',
      permission: 'congregations:read',
    },
  ];

  readonly items = computed(() =>
    this.allItems.filter((item) => this.#auth.hasPermission(item.permission)),
  );

  readonly allFinanceItems: readonly SidebarFinanceItem[] = [
    { route: '/finance', labelKey: 'NAV.FINANCE_DASHBOARD', permission: 'finance:read' },
    { route: '/finance/entries', labelKey: 'NAV.FINANCIAL_ENTRIES', permission: 'finance:read' },
    { route: '/finance/assets', labelKey: 'NAV.ASSETS', permission: 'assets:read' },
    { route: '/finance/reports', labelKey: 'NAV.FINANCIAL_REPORTS', permission: 'finance:read' },
  ];

  readonly financeItems = computed(() =>
    this.allFinanceItems.filter((item) => this.#auth.hasPermission(item.permission)),
  );

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
    const firstRoute = this.financeItems()[0]?.route ?? '/finance';
    if (!this.expanded()) {
      void this.#router.navigateByUrl(firstRoute);
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
