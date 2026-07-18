import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AppDialog } from '@components/app-dialog/app-dialog';
import { FamilyForm } from '@components/families/family-form/family-form';
import { FamilyMembersPanel } from '@components/families/family-members-panel/family-members-panel';
import { TranslatePipe } from '@ngx-translate/core';
import { IFamily } from '@interfaces/IFamily';
import { AuthService } from '@services/auth-service';
import { FamiliesService } from '@services/families-service';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-families-list',
  imports: [
    AppDialog,
    FamilyForm,
    FamilyMembersPanel,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
  ],
  templateUrl: './families-list.html',
  styleUrl: './families-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamiliesList implements OnInit {
  readonly #familiesService = inject(FamiliesService);
  readonly #auth = inject(AuthService);
  readonly #destroyRef = inject(DestroyRef);

  readonly families = signal<IFamily[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly limit = signal(20);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly deleting = signal(false);
  readonly pendingDeleteId = signal<string | null>(null);
  readonly feedback = signal<string | null>(null);
  readonly showForm = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly managingMembersId = signal<string | null>(null);

  readonly totalPages = computed(() => {
    const pages = Math.ceil(this.total() / this.limit());
    return pages > 0 ? pages : 1;
  });

  readonly canWrite = computed(() => this.#auth.hasPermission('members:write'));

  readonly filterForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.#loadFamilies();

    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((prev, next) => prev.search === next.search),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => {
        this.page.set(1);
        this.#loadFamilies();
      });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.pendingDeleteId.set(null);
    this.managingMembersId.set(null);
    this.showForm.set(true);
  }

  openEdit(id: string): void {
    this.editingId.set(id);
    this.pendingDeleteId.set(null);
    this.managingMembersId.set(null);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  afterSave(): void {
    this.closeForm();
    this.feedback.set('FAMILIES.SAVE_SUCCESS');
    this.#loadFamilies();
  }

  openMembers(id: string): void {
    this.showForm.set(false);
    this.pendingDeleteId.set(null);
    this.managingMembersId.set(id);
  }

  closeMembers(): void {
    this.managingMembersId.set(null);
  }

  previousPage(): void {
    if (this.page() <= 1) {
      return;
    }
    this.page.update((value) => value - 1);
    this.#loadFamilies();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) {
      return;
    }
    this.page.update((value) => value + 1);
    this.#loadFamilies();
  }

  askDelete(familyId: string): void {
    this.closeForm();
    this.managingMembersId.set(null);
    this.pendingDeleteId.set(familyId);
    this.feedback.set(null);
  }

  cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  confirmDelete(): void {
    const id = this.pendingDeleteId();
    if (!id) {
      return;
    }

    this.deleting.set(true);
    this.error.set(false);

    this.#familiesService
      .remove(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.pendingDeleteId.set(null);
          this.feedback.set('FAMILIES.DELETE_SUCCESS');
          this.#loadFamilies();
        },
        error: () => {
          this.deleting.set(false);
          this.feedback.set('ERRORS.SAVE_FAILED');
        },
      });
  }

  #loadFamilies(): void {
    this.loading.set(true);
    this.error.set(false);

    const { search } = this.filterForm.getRawValue();

    this.#familiesService
      .list({
        page: this.page(),
        limit: this.limit(),
        search: search.trim() || undefined,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.families.set(response.data);
          this.total.set(response.total);
          this.page.set(response.page);
          this.limit.set(response.limit);
          this.loading.set(false);
        },
        error: () => {
          this.families.set([]);
          this.total.set(0);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }
}
