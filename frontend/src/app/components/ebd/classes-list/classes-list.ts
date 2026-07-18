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
import { AppDialog } from '@components/app-dialog/app-dialog';
import { ClassForm } from '@components/ebd/class-form/class-form';
import { TranslatePipe } from '@ngx-translate/core';
import { CLASS_AGE_GROUPS, ClassAgeGroup } from '@enums/class-age-group';
import { CLASS_STATUSES, ClassStatus } from '@enums/class-status';
import { IEbdClass } from '@interfaces/IEbdClass';
import { AuthService } from '@services/auth-service';
import { ClassesService } from '@services/classes-service';
import { debounceTime, distinctUntilChanged } from 'rxjs';

const DAY_OF_WEEK_VALUES = [0, 1, 2, 3, 4, 5, 6] as const;

const DAY_LABEL_KEYS: Record<(typeof DAY_OF_WEEK_VALUES)[number], string> = {
  0: 'EBD_CLASSES.DAY_SUNDAY',
  1: 'EBD_CLASSES.DAY_MONDAY',
  2: 'EBD_CLASSES.DAY_TUESDAY',
  3: 'EBD_CLASSES.DAY_WEDNESDAY',
  4: 'EBD_CLASSES.DAY_THURSDAY',
  5: 'EBD_CLASSES.DAY_FRIDAY',
  6: 'EBD_CLASSES.DAY_SATURDAY',
};

@Component({
  selector: 'app-classes-list',
  imports: [AppDialog, ClassForm, ReactiveFormsModule, TranslatePipe],
  templateUrl: './classes-list.html',
  styleUrl: './classes-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassesList implements OnInit {
  readonly #classesService = inject(ClassesService);
  readonly #auth = inject(AuthService);
  readonly #destroyRef = inject(DestroyRef);

  readonly statuses = CLASS_STATUSES;
  readonly ageGroups = CLASS_AGE_GROUPS;

  readonly classes = signal<IEbdClass[]>([]);
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

  readonly totalPages = computed(() => {
    const pages = Math.ceil(this.total() / this.limit());
    return pages > 0 ? pages : 1;
  });

  readonly canWrite = computed(() => this.#auth.hasPermission('classes:write'));

  readonly filterForm = new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    status: new FormControl<ClassStatus | ''>('', { nonNullable: true }),
    ageGroup: new FormControl<ClassAgeGroup | ''>('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.#loadClasses();

    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(
          (prev, next) =>
            prev.q === next.q && prev.status === next.status && prev.ageGroup === next.ageGroup,
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => {
        this.page.set(1);
        this.#loadClasses();
      });
  }

  statusLabelKey(status: ClassStatus): string {
    return status === ClassStatus.ACTIVE ? 'EBD_CLASSES.ACTIVE' : 'EBD_CLASSES.INACTIVE';
  }

  ageGroupLabelKey(ageGroup: ClassAgeGroup): string {
    return `EBD_CLASSES.AGE_GROUP_${ageGroup.toUpperCase()}`;
  }

  dayLabelKey(dayOfWeek: number): string {
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return 'EBD_CLASSES.DAY_SUNDAY';
    }
    return DAY_LABEL_KEYS[dayOfWeek as (typeof DAY_OF_WEEK_VALUES)[number]];
  }

  openCreate(): void {
    this.editingId.set(null);
    this.pendingDeleteId.set(null);
    this.showForm.set(true);
  }

  openEdit(id: string): void {
    this.editingId.set(id);
    this.pendingDeleteId.set(null);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  afterSave(): void {
    this.closeForm();
    this.feedback.set('EBD_CLASSES.SAVE_SUCCESS');
    this.#loadClasses();
  }

  previousPage(): void {
    if (this.page() <= 1) {
      return;
    }
    this.page.update((value) => value - 1);
    this.#loadClasses();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) {
      return;
    }
    this.page.update((value) => value + 1);
    this.#loadClasses();
  }

  askDelete(classId: string): void {
    this.closeForm();
    this.pendingDeleteId.set(classId);
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

    this.#classesService
      .remove(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.pendingDeleteId.set(null);
          this.feedback.set('EBD_CLASSES.DELETE_SUCCESS');
          this.#loadClasses();
        },
        error: () => {
          this.deleting.set(false);
          this.feedback.set('EBD_CLASSES.DELETE_ERROR');
        },
      });
  }

  #loadClasses(): void {
    this.loading.set(true);
    this.error.set(false);

    const { q, status, ageGroup } = this.filterForm.getRawValue();

    this.#classesService
      .list({
        page: this.page(),
        limit: this.limit(),
        q: q.trim() || undefined,
        status: status || undefined,
        ageGroup: ageGroup || undefined,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.classes.set(response.data);
          this.total.set(response.total);
          this.page.set(response.page);
          this.limit.set(response.limit);
          this.loading.set(false);
        },
        error: () => {
          this.classes.set([]);
          this.total.set(0);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }
}
