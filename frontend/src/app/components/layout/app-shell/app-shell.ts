import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageSwitcher } from '@components/layout/language-switcher/language-switcher';
import { SidebarNav } from '@components/layout/sidebar-nav/sidebar-nav';
import { AuthService } from '@services/auth-service';
import { filter, startWith } from 'rxjs';

const AUTO_COLLAPSE_MS = 2000;
const SIDEBAR_ID = 'app-sidebar';

@Component({
  selector: 'app-app-shell',
  imports: [RouterOutlet, TranslatePipe, LanguageSwitcher, SidebarNav],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShell {
  readonly #authService = inject(AuthService);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);

  readonly sidebarId = SIDEBAR_ID;
  readonly sidebarExpanded = signal(this.#initialExpanded());
  readonly #currentUrl = signal(this.#router.url);

  #collapseTimer: ReturnType<typeof setTimeout> | null = null;

  readonly pageTitleKey = computed(() => this.#resolvePageTitle(this.#currentUrl()));
  readonly contentLayoutClass = computed(() =>
    [
      'flex min-h-screen min-w-0 flex-1 flex-col transition-[margin] duration-200',
      this.sidebarExpanded() ? 'md:ml-60' : 'md:ml-16',
    ].join(' '),
  );

  constructor() {
    this.#router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        startWith(null),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => {
        this.#currentUrl.set(this.#router.url);
      });

    this.#destroyRef.onDestroy(() => this.#clearCollapseTimer());
  }

  toggleSidebar(): void {
    this.#clearCollapseTimer();
    this.sidebarExpanded.update((expanded) => !expanded);
  }

  onSidebarEnter(): void {
    this.#clearCollapseTimer();
  }

  onSidebarLeave(): void {
    this.#scheduleAutoCollapse();
  }

  onSidebarFocusIn(): void {
    this.#clearCollapseTimer();
  }

  onSidebarFocusOut(event: FocusEvent): void {
    const sidebar = event.currentTarget as HTMLElement | null;
    const next = event.relatedTarget as Node | null;

    if (sidebar && next && sidebar.contains(next)) {
      return;
    }

    this.#scheduleAutoCollapse();
  }

  logout(): void {
    this.#authService.logout();
  }

  #resolvePageTitle(url: string): string {
    const path = url.split('?')[0] ?? '';

    if (path.startsWith('/announcements')) {
      return 'APP_SHELL.PAGE_ANNOUNCEMENTS';
    }
    if (path.startsWith('/finance/entries')) {
      return 'APP_SHELL.PAGE_ENTRIES';
    }
    if (path.startsWith('/finance/assets')) {
      return 'APP_SHELL.PAGE_ASSETS';
    }
    if (path.startsWith('/finance/reports')) {
      return 'APP_SHELL.PAGE_REPORTS';
    }
    if (path.startsWith('/finance')) {
      return 'APP_SHELL.PAGE_FINANCE';
    }
    if (path.startsWith('/secretariat/agenda')) {
      return 'APP_SHELL.PAGE_SECRETARIAT_AGENDA';
    }
    if (path.startsWith('/secretariat/schedules')) {
      return 'APP_SHELL.PAGE_SECRETARIAT_SCHEDULES';
    }
    if (path.startsWith('/secretariat/visitors')) {
      return 'APP_SHELL.PAGE_SECRETARIAT_VISITORS';
    }
    if (path.startsWith('/secretariat/attendance')) {
      return 'APP_SHELL.PAGE_SECRETARIAT_ATTENDANCE';
    }
    if (path.startsWith('/secretariat/documents')) {
      return 'APP_SHELL.PAGE_SECRETARIAT_DOCUMENTS';
    }
    if (path.startsWith('/secretariat')) {
      return 'APP_SHELL.PAGE_SECRETARIAT';
    }
    if (path.startsWith('/roles')) {
      return 'APP_SHELL.PAGE_ROLES';
    }
    if (path.startsWith('/members')) {
      return 'APP_SHELL.PAGE_MEMBERS';
    }
    if (path.startsWith('/families/birthdays')) {
      return 'APP_SHELL.PAGE_FAMILIES_BIRTHDAYS';
    }
    if (path.startsWith('/families')) {
      return 'APP_SHELL.PAGE_FAMILIES';
    }
    if (path.startsWith('/ministries')) {
      return 'APP_SHELL.PAGE_MINISTRIES';
    }
    if (path.startsWith('/ebd/reports')) {
      return 'APP_SHELL.PAGE_EBD_REPORTS';
    }
    if (path.startsWith('/ebd')) {
      return 'APP_SHELL.PAGE_EBD';
    }
    if (path.startsWith('/small-groups/reports')) {
      return 'APP_SHELL.PAGE_SMALL_GROUPS_REPORTS';
    }
    if (path.startsWith('/small-groups')) {
      return 'APP_SHELL.PAGE_SMALL_GROUPS';
    }
    if (path.startsWith('/congregation') || path.startsWith('/congregations')) {
      return 'APP_SHELL.PAGE_CONGREGATION';
    }
    if (path.startsWith('/users')) {
      return 'APP_SHELL.PAGE_USERS';
    }

    return 'APP_SHELL.APP_NAME';
  }

  #initialExpanded(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return true;
    }

    return window.matchMedia('(min-width: 768px)').matches;
  }

  #scheduleAutoCollapse(): void {
    if (!this.sidebarExpanded()) {
      return;
    }

    this.#clearCollapseTimer();
    this.#collapseTimer = setTimeout(() => {
      this.sidebarExpanded.set(false);
      this.#collapseTimer = null;
    }, AUTO_COLLAPSE_MS);
  }

  #clearCollapseTimer(): void {
    if (this.#collapseTimer !== null) {
      clearTimeout(this.#collapseTimer);
      this.#collapseTimer = null;
    }
  }
}
