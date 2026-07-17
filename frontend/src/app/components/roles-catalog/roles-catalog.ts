import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { IRole } from '@interfaces/IRole';
import { RolesService } from '@services/roles-service';

@Component({
  selector: 'app-roles-catalog',
  imports: [TranslatePipe],
  templateUrl: './roles-catalog.html',
  styleUrl: './roles-catalog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesCatalog implements OnInit {
  readonly #rolesService = inject(RolesService);
  readonly #translate = inject(TranslateService);
  readonly #destroyRef = inject(DestroyRef);

  readonly roles = signal<IRole[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);

  ngOnInit(): void {
    this.#loadRoles();
  }

  roleLabel(role: IRole): string {
    const key = `ROLES.CODE_${role.code}`;
    const translated = this.#translate.instant(key);
    return translated !== key ? translated : role.name;
  }

  #loadRoles(): void {
    this.loading.set(true);
    this.error.set(false);

    this.#rolesService
      .list()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (roles) => {
          this.roles.set(roles);
          this.loading.set(false);
        },
        error: () => {
          this.roles.set([]);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }
}
