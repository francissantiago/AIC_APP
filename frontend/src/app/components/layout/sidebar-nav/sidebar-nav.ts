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
  icon:
    | 'dashboard'
    | 'announcements'
    | 'users'
    | 'roles'
    | 'members'
    | 'membership-cards'
    | 'families'
    | 'ministries'
    | 'congregation';
  permission?: string;
};

export type SidebarFinanceItem = {
  route: string;
  labelKey: string;
  permission: string;
};

export type SidebarSecretariatItem = {
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
  readonly ebdOpen = signal(this.#router.url.startsWith('/ebd'));
  readonly smallGroupsOpen = signal(this.#router.url.startsWith('/small-groups'));
  readonly congregationsOpen = signal(
    this.#router.url.startsWith('/congregation') || this.#router.url.startsWith('/congregations'),
  );

  readonly canViewFinanceSection = computed(() =>
    this.#auth.hasAnyPermission('finance:read', 'assets:read'),
  );
  readonly canViewSecretariat = computed(() =>
    this.#auth.hasAnyPermission('secretariat:read', 'schedules:read'),
  );
  readonly canViewEbd = computed(() => this.#auth.hasPermission('classes:read'));
  readonly canViewSmallGroups = computed(() => this.#auth.hasPermission('small-groups:read'));
  readonly canViewCongregations = computed(() => this.#auth.hasPermission('congregations:read'));

  readonly allItems: readonly SidebarNavItem[] = [
    {
      route: '/dashboard',
      labelKey: 'NAV.DASHBOARD',
      icon: 'dashboard',
    },
    {
      route: '/announcements',
      labelKey: 'NAV.ANNOUNCEMENTS',
      icon: 'announcements',
      permission: 'announcements:read',
    },
    { route: '/users', labelKey: 'NAV.USERS', icon: 'users', permission: 'users:read' },
    { route: '/roles', labelKey: 'NAV.ROLES', icon: 'roles', permission: 'roles:read' },
    {
      route: '/members',
      labelKey: 'NAV.MEMBERS',
      icon: 'members',
      permission: 'members:read',
    },
    {
      route: '/membership-cards',
      labelKey: 'NAV.MEMBERSHIP_CARDS',
      icon: 'membership-cards',
      permission: 'membership-cards:read',
    },
    {
      route: '/families',
      labelKey: 'NAV.FAMILIES',
      icon: 'families',
      permission: 'members:read',
    },
    {
      route: '/ministries',
      labelKey: 'NAV.MINISTRIES',
      icon: 'ministries',
      permission: 'ministries:read',
    },
  ];

  readonly congregationItems = [
    { route: '/congregation', labelKey: 'NAV.CONGREGATION_ACTIVE' },
    { route: '/congregations', labelKey: 'NAV.CONGREGATIONS_BRANCHES' },
  ] as const;

  readonly ebdItems = [
    { route: '/ebd', labelKey: 'NAV.EBD' },
    { route: '/ebd/reports', labelKey: 'NAV.EBD_REPORTS' },
  ] as const;

  readonly smallGroupsItems = [
    { route: '/small-groups', labelKey: 'NAV.SMALL_GROUPS' },
    { route: '/small-groups/reports', labelKey: 'NAV.SMALL_GROUPS_REPORTS' },
  ] as const;

  readonly items = computed(() =>
    this.allItems.filter((item) => !item.permission || this.#auth.hasPermission(item.permission)),
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

  readonly allSecretariatItems: readonly SidebarSecretariatItem[] = [
    {
      route: '/secretariat',
      labelKey: 'NAV.SECRETARIAT_DASHBOARD',
      permission: 'secretariat:read',
    },
    {
      route: '/secretariat/agenda',
      labelKey: 'NAV.SECRETARIAT_AGENDA',
      permission: 'secretariat:read',
    },
    {
      route: '/secretariat/visitors',
      labelKey: 'NAV.SECRETARIAT_VISITORS',
      permission: 'secretariat:read',
    },
    {
      route: '/secretariat/attendance',
      labelKey: 'NAV.SECRETARIAT_ATTENDANCE',
      permission: 'secretariat:read',
    },
    {
      route: '/secretariat/documents',
      labelKey: 'NAV.SECRETARIAT_DOCUMENTS',
      permission: 'secretariat:read',
    },
    {
      route: '/secretariat/schedules',
      labelKey: 'NAV.SECRETARIAT_SCHEDULES',
      permission: 'schedules:read',
    },
  ];

  readonly secretariatItems = computed(() =>
    this.allSecretariatItems.filter((item) => this.#auth.hasPermission(item.permission)),
  );

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
        if (event.urlAfterRedirects.startsWith('/ebd')) {
          this.ebdOpen.set(true);
        }
        if (event.urlAfterRedirects.startsWith('/small-groups')) {
          this.smallGroupsOpen.set(true);
        }
        if (
          event.urlAfterRedirects.startsWith('/congregation') ||
          event.urlAfterRedirects.startsWith('/congregations')
        ) {
          this.congregationsOpen.set(true);
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
    const firstRoute = this.secretariatItems()[0]?.route ?? '/secretariat';
    if (!this.expanded()) {
      void this.#router.navigateByUrl(firstRoute);
      return;
    }
    this.secretariatOpen.update((value) => !value);
  }

  toggleEbd(): void {
    if (!this.expanded()) {
      void this.#router.navigateByUrl('/ebd');
      return;
    }
    this.ebdOpen.update((value) => !value);
  }

  toggleSmallGroups(): void {
    if (!this.expanded()) {
      void this.#router.navigateByUrl('/small-groups');
      return;
    }
    this.smallGroupsOpen.update((value) => !value);
  }

  toggleCongregations(): void {
    if (!this.expanded()) {
      void this.#router.navigateByUrl('/congregation');
      return;
    }
    this.congregationsOpen.update((value) => !value);
  }

  navLinkTestId(route: string): string {
    const segment = route.replace(/^\//, '').replace(/\//g, '-');
    return `nav-${segment}`;
  }
}
