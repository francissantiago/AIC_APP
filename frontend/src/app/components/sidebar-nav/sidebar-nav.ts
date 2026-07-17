import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

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
  readonly expanded = input(true);

  readonly items: readonly SidebarNavItem[] = [
    { route: '/users', labelKey: 'NAV.USERS', icon: 'users' },
    { route: '/roles', labelKey: 'NAV.ROLES', icon: 'roles' },
    { route: '/members', labelKey: 'NAV.MEMBERS', icon: 'members' },
    { route: '/congregation', labelKey: 'NAV.CONGREGATIONS', icon: 'congregation' },
  ];
}
