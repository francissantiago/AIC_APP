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
import { LanguageSwitcher } from '@components/language-switcher/language-switcher';
import { SidebarNav } from '@components/sidebar-nav/sidebar-nav';
import { AuthService } from '@services/auth-service';
import { filter, startWith } from 'rxjs';

const AUTO_COLLAPSE_MS = 3000;
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
    if (!this.sidebarExpanded()) {
      this.sidebarExpanded.set(true);
    }
  }

  onSidebarLeave(): void {
    this.#scheduleAutoCollapse();
  }

  onSidebarFocusIn(): void {
    this.#clearCollapseTimer();
    if (!this.sidebarExpanded()) {
      this.sidebarExpanded.set(true);
    }
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

    if (path.startsWith('/roles')) {
      return 'APP_SHELL.PAGE_ROLES';
    }
    if (path.startsWith('/members')) {
      return 'APP_SHELL.PAGE_MEMBERS';
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
