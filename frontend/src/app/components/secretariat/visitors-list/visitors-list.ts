import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SECRETARIAT_WRITE_ROLES, hasAnyRole } from '@guards/role-guard';
import { IVisitor } from '@interfaces/ISecretariat';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '@services/auth-service';
import { SecretariatService } from '@services/secretariat-service';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-visitors-list',
  imports: [ReactiveFormsModule, TranslatePipe],
  template: `
    <section class="w-full">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-xl font-semibold text-slate-900">
          {{ 'SECRETARIAT.VISITORS_TITLE' | translate }}
        </h1>
        @if (canWrite()) {
          <button
            class="rounded-md bg-slate-500 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 disabled:opacity-50"
            type="button"
            (click)="openCreate()"
          >
            {{ 'SECRETARIAT.NEW' | translate }}
          </button>
        }
      </div>

      @if (showForm()) {
        <section class="mb-5 w-full max-w-7xl" aria-labelledby="visitor-form-title">
          <h2 id="visitor-form-title" class="mb-4 text-xl font-semibold text-slate-900">
            {{ (editing() ? 'SECRETARIAT.EDIT' : 'SECRETARIAT.NEW') | translate }}
          </h2>
          <form
            [formGroup]="form"
            (ngSubmit)="submit()"
            class="grid gap-4 md:grid-cols-2"
            novalidate
          >
            <label class="flex flex-col gap-1 text-sm text-slate-700">
              <span>{{ 'SECRETARIAT.FULL_NAME' | translate }}</span>
              <input
                class="w-full min-w-0 rounded-md border px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
                formControlName="fullName"
                maxlength="150"
                [attr.aria-invalid]="
                  form.controls.fullName.touched && form.controls.fullName.invalid
                "
                [attr.aria-describedby]="
                  form.controls.fullName.touched && form.controls.fullName.invalid
                    ? 'visitor-name-error'
                    : null
                "
              />
              @if (form.controls.fullName.touched && form.controls.fullName.invalid) {
                <span id="visitor-name-error" class="text-xs text-red-700">
                  {{ 'COMMON.REQUIRED_FIELD' | translate }}
                </span>
              }
            </label>
            <label class="flex flex-col gap-1 text-sm text-slate-700">
              <span>{{ 'SECRETARIAT.PHONE' | translate }}</span>
              <input
                class="w-full min-w-0 rounded-md border px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
                formControlName="phone"
                maxlength="30"
              />
            </label>
            <label class="flex flex-col gap-1 text-sm text-slate-700">
              <span>{{ 'SECRETARIAT.VISIT_DATE' | translate }}</span>
              <input
                class="w-full min-w-0 rounded-md border px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
                type="date"
                formControlName="visitDate"
                [attr.aria-invalid]="
                  form.controls.visitDate.touched && form.controls.visitDate.invalid
                "
                [attr.aria-describedby]="
                  form.controls.visitDate.touched && form.controls.visitDate.invalid
                    ? 'visitor-date-error'
                    : null
                "
              />
              @if (form.controls.visitDate.touched && form.controls.visitDate.invalid) {
                <span id="visitor-date-error" class="text-xs text-red-700">
                  {{ 'COMMON.REQUIRED_FIELD' | translate }}
                </span>
              }
            </label>
            <label class="flex items-center gap-2 self-end text-sm text-slate-700">
              <input type="checkbox" formControlName="followUpDone" class="size-4" />
              <span>{{ 'SECRETARIAT.FOLLOW_UP_DONE' | translate }}</span>
            </label>
            <label class="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
              <span>{{ 'SECRETARIAT.NOTES' | translate }}</span>
              <textarea
                class="w-full min-w-0 rounded-md border px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
                rows="3"
                formControlName="notes"
              ></textarea>
            </label>
            @if (saveError()) {
              <p role="alert" class="text-sm text-red-700 md:col-span-2">
                {{ 'SECRETARIAT.SAVE_ERROR' | translate }}
              </p>
            }
            <div class="mt-2 flex flex-wrap gap-3 md:col-span-2">
              <button
                class="rounded-md bg-slate-500 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 disabled:opacity-50"
                type="submit"
                [disabled]="saving()"
              >
                {{ 'COMMON.SAVE' | translate }}
              </button>
              <button
                class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                type="button"
                (click)="closeForm()"
              >
                {{ 'COMMON.CANCEL' | translate }}
              </button>
            </div>
          </form>
        </section>
      }

      <form
        [formGroup]="filterForm"
        (ngSubmit)="applyFilters()"
        class="mb-4 grid gap-3 md:grid-cols-4"
        [attr.aria-label]="'COMMON.FILTER' | translate"
      >
        <label class="flex min-w-0 flex-col gap-1 text-sm text-slate-700">
          <span>{{ 'COMMON.SEARCH' | translate }}</span>
          <input
            class="w-full min-w-0 rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            type="search"
            formControlName="search"
          />
        </label>
        <label class="flex min-w-0 flex-col gap-1 text-sm text-slate-700">
          <span>{{ 'SECRETARIAT.FROM' | translate }}</span>
          <input
            class="w-full min-w-0 rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            type="date"
            formControlName="from"
          />
        </label>
        <label class="flex min-w-0 flex-col gap-1 text-sm text-slate-700">
          <span>{{ 'SECRETARIAT.TO' | translate }}</span>
          <input
            class="w-full min-w-0 rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            type="date"
            formControlName="to"
          />
        </label>
        <button
          class="self-end rounded-md bg-slate-500 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 disabled:opacity-50"
          type="submit"
        >
          {{ 'COMMON.FILTER' | translate }}
        </button>
      </form>

      @if (pendingDelete(); as id) {
        <div
          role="alertdialog"
          aria-labelledby="visitor-delete-confirmation"
          class="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <p id="visitor-delete-confirmation" class="font-medium">
            {{ 'SECRETARIAT.CONFIRM_DELETE' | translate }}
          </p>
          <div class="mt-3 flex gap-2">
            <button
              class="rounded-md bg-red-700 px-3 py-1.5 text-white hover:bg-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              type="button"
              (click)="confirmDelete(id)"
            >
              {{ 'COMMON.YES' | translate }}
            </button>
            <button
              class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              type="button"
              (click)="pendingDelete.set(null)"
            >
              {{ 'COMMON.NO' | translate }}
            </button>
          </div>
        </div>
      }

      @if (loading()) {
        <p class="text-sm text-slate-600" role="status">{{ 'COMMON.LOADING' | translate }}</p>
      } @else if (error()) {
        <p role="alert" class="text-sm text-red-700">{{ 'SECRETARIAT.LOAD_ERROR' | translate }}</p>
      } @else if (visitors().length === 0) {
        <p class="text-sm text-slate-600">{{ 'SECRETARIAT.EMPTY' | translate }}</p>
      } @else {
        <div class="overflow-x-auto rounded-md border border-slate-200">
          <table class="min-w-full text-left text-sm">
            <caption class="sr-only">
              {{
                'SECRETARIAT.VISITORS_TITLE' | translate
              }}
            </caption>
            <thead class="bg-slate-50 text-slate-700">
              <tr>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'SECRETARIAT.FULL_NAME' | translate }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'SECRETARIAT.PHONE' | translate }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'SECRETARIAT.VISIT_DATE' | translate }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'SECRETARIAT.FOLLOW_UP_DONE' | translate }}
                </th>
                @if (canWrite()) {
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'COMMON.ACTIONS' | translate }}
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (visitor of visitors(); track visitor.id) {
                <tr class="border-t border-slate-100">
                  <td class="px-3 py-2 text-slate-900">{{ visitor.fullName }}</td>
                  <td class="px-3 py-2 text-slate-700">
                    {{ visitor.phone || ('COMMON.NOT_AVAILABLE' | translate) }}
                  </td>
                  <td class="px-3 py-2 text-slate-700">{{ visitor.visitDate }}</td>
                  <td class="px-3 py-2 text-slate-700">
                    {{ (visitor.followUpDone ? 'COMMON.YES' : 'COMMON.NO') | translate }}
                  </td>
                  @if (canWrite()) {
                    <td class="px-3 py-2">
                      <div class="flex flex-wrap gap-2">
                        <button
                          class="text-slate-900 underline underline-offset-2 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                          type="button"
                          (click)="openEdit(visitor)"
                        >
                          {{ 'COMMON.EDIT' | translate }}
                        </button>
                        <button
                          class="text-red-700 underline underline-offset-2 hover:text-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                          type="button"
                          (click)="pendingDelete.set(visitor.id)"
                        >
                          {{ 'COMMON.DELETE' | translate }}
                        </button>
                      </div>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-700">
          <span>{{ 'COMMON.PAGE' | translate }} {{ page() }} / {{ totalPages() }}</span>
          <div class="flex gap-2">
            <button
              class="rounded-md border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50"
              [disabled]="page() <= 1"
              type="button"
              (click)="changePage(-1)"
            >
              {{ 'COMMON.PREVIOUS' | translate }}
            </button>
            <button
              class="rounded-md border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50"
              [disabled]="page() >= totalPages()"
              type="button"
              (click)="changePage(1)"
            >
              {{ 'COMMON.NEXT' | translate }}
            </button>
          </div>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisitorsList implements OnInit {
  readonly #secretariat = inject(SecretariatService);
  readonly #auth = inject(AuthService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly visitors = signal<IVisitor[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly showForm = signal(false);
  readonly editing = signal<IVisitor | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal(false);
  readonly pendingDelete = signal<string | null>(null);

  readonly canWrite = computed(() =>
    hasAnyRole(this.#auth.currentUser()?.roles.map((r) => r.code) ?? [], SECRETARIAT_WRITE_ROLES),
  );
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));

  readonly filterForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    from: new FormControl('', { nonNullable: true }),
    to: new FormControl('', { nonNullable: true }),
  });

  readonly form = new FormGroup({
    fullName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    phone: new FormControl('', { nonNullable: true }),
    visitDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    followUpDone: new FormControl(false, { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.load();
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({
      fullName: '',
      phone: '',
      visitDate: this.#today(),
      followUpDone: false,
      notes: '',
    });
    this.showForm.set(true);
  }

  openEdit(visitor: IVisitor): void {
    this.editing.set(visitor);
    this.form.reset({
      fullName: visitor.fullName,
      phone: visitor.phone ?? '',
      visitDate: visitor.visitDate,
      followUpDone: visitor.followUpDone,
      notes: visitor.notes ?? '',
    });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editing.set(null);
    this.saveError.set(false);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.#focusFirstInvalid();
      return;
    }
    const v = this.form.getRawValue();
    const payload = {
      fullName: v.fullName,
      phone: v.phone || null,
      visitDate: v.visitDate,
      followUpDone: v.followUpDone,
      notes: v.notes || null,
    };
    const request = this.editing()
      ? this.#secretariat.updateVisitor(this.editing()!.id, payload)
      : this.#secretariat.createVisitor(payload);
    this.saving.set(true);
    this.saveError.set(false);
    request.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set(true);
      },
    });
  }

  applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  changePage(delta: number): void {
    this.page.update((v) => v + delta);
    this.load();
  }

  confirmDelete(id: string): void {
    this.#secretariat
      .removeVisitor(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.pendingDelete.set(null);
          this.load();
        },
        error: () => this.error.set(true),
      });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const v = this.filterForm.getRawValue();
    this.#secretariat
      .visitors({
        page: this.page(),
        limit: PAGE_SIZE,
        search: v.search.trim() || undefined,
        from: v.from || undefined,
        to: v.to || undefined,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (r) => {
          this.visitors.set(r.data);
          this.total.set(r.total);
          this.page.set(r.page);
          this.loading.set(false);
        },
        error: () => {
          this.visitors.set([]);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }

  #today(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  #focusFirstInvalid(): void {
    queueMicrotask(() => {
      this.#host.nativeElement
        .querySelector<HTMLElement>('input.ng-invalid, select.ng-invalid, textarea.ng-invalid')
        ?.focus();
    });
  }
}
