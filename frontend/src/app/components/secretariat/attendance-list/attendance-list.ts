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
import { AppDialog } from '@components/app-dialog/app-dialog';
import { ATTENDANCE_EVENT_TYPES, AttendanceEventType } from '@enums/secretariat';
import { TranslatePipe } from '@ngx-translate/core';
import { IAttendanceRecord } from '@interfaces/ISecretariat';
import { AuthService } from '@services/auth-service';
import { ApiErrorService } from '@services/api-error.service';
import { SecretariatService } from '@services/secretariat-service';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-attendance-list',
  imports: [AppDialog, ReactiveFormsModule, TranslatePipe],
  template: `
    <section class="w-full">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-xl font-semibold text-slate-900">
          {{ 'SECRETARIAT.ATTENDANCE_TITLE' | translate }}
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

      <app-dialog
        [(open)]="showForm"
        [title]="(editing() ? 'SECRETARIAT.EDIT' : 'SECRETARIAT.NEW') | translate"
        (closed)="closeForm()"
      >
        <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-4 md:grid-cols-2" novalidate>
          <label class="flex flex-col gap-1 text-sm text-slate-700">
            <span>{{ 'SECRETARIAT.EVENT_DATE' | translate }}</span>
            <input
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
              type="date"
              formControlName="eventDate"
              [attr.aria-invalid]="
                form.controls.eventDate.touched && form.controls.eventDate.invalid
              "
              [attr.aria-describedby]="
                form.controls.eventDate.touched && form.controls.eventDate.invalid
                  ? 'attendance-date-error'
                  : null
              "
            />
            @if (form.controls.eventDate.touched && form.controls.eventDate.invalid) {
              <span id="attendance-date-error" class="text-xs text-red-700">
                {{ 'COMMON.REQUIRED_FIELD' | translate }}
              </span>
            }
          </label>
          <label class="flex flex-col gap-1 text-sm text-slate-700">
            <span>{{ 'SECRETARIAT.EVENT_TYPE' | translate }}</span>
            <select
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
              formControlName="eventType"
            >
              @for (type of eventTypes; track type) {
                <option [value]="type">{{ typeLabel(type) | translate }}</option>
              }
            </select>
          </label>
          <label class="flex flex-col gap-1 text-sm text-slate-700">
            <span>{{ 'SECRETARIAT.TOTAL_PRESENT' | translate }}</span>
            <input
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
              type="number"
              min="0"
              step="1"
              formControlName="totalPresent"
              [attr.aria-invalid]="
                form.controls.totalPresent.touched && form.controls.totalPresent.invalid
              "
              [attr.aria-describedby]="
                form.controls.totalPresent.touched && form.controls.totalPresent.invalid
                  ? 'attendance-total-error'
                  : null
              "
            />
            @if (form.controls.totalPresent.touched && form.controls.totalPresent.invalid) {
              <span id="attendance-total-error" class="text-xs text-red-700">
                {{ 'COMMON.REQUIRED_FIELD' | translate }}
              </span>
            }
          </label>
          <div class="grid grid-cols-2 gap-4">
            <label class="flex flex-col gap-1 text-sm text-slate-700">
              <span>{{ 'SECRETARIAT.ADULTS' | translate }}</span>
              <input
                class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
                type="number"
                min="0"
                step="1"
                formControlName="adults"
              />
            </label>
            <label class="flex flex-col gap-1 text-sm text-slate-700">
              <span>{{ 'SECRETARIAT.CHILDREN' | translate }}</span>
              <input
                class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
                type="number"
                min="0"
                step="1"
                formControlName="children"
              />
            </label>
          </div>
          <label class="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
            <span>{{ 'SECRETARIAT.NOTES' | translate }}</span>
            <textarea
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
              rows="3"
              formControlName="notes"
            ></textarea>
          </label>
          @if (errorMessage(); as message) {
            <p role="alert" class="text-sm text-red-700 md:col-span-2">
              {{ message }}
              @if (supportHint(); as hint) {
                <span class="mt-1 block text-xs opacity-90">{{ hint }}</span>
              }
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
      </app-dialog>

      <form
        [formGroup]="filterForm"
        (ngSubmit)="applyFilters()"
        class="mb-4 grid gap-3 md:grid-cols-4"
        [attr.aria-label]="'COMMON.FILTER' | translate"
      >
        <label class="flex min-w-0 flex-col gap-1 text-sm text-slate-700">
          <span>{{ 'SECRETARIAT.FROM' | translate }}</span>
          <input
            class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            type="date"
            formControlName="from"
          />
        </label>
        <label class="flex min-w-0 flex-col gap-1 text-sm text-slate-700">
          <span>{{ 'SECRETARIAT.TO' | translate }}</span>
          <input
            class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            type="date"
            formControlName="to"
          />
        </label>
        <label class="flex min-w-0 flex-col gap-1 text-sm text-slate-700">
          <span>{{ 'SECRETARIAT.EVENT_TYPE' | translate }}</span>
          <select
            class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            formControlName="eventType"
          >
            <option value="">{{ 'COMMON.FILTER' | translate }}</option>
            @for (type of eventTypes; track type) {
              <option [value]="type">{{ typeLabel(type) | translate }}</option>
            }
          </select>
        </label>
        <button
          class="self-end rounded-md bg-slate-500 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 disabled:opacity-50"
          type="submit"
        >
          {{ 'COMMON.FILTER' | translate }}
        </button>
      </form>

      <app-dialog
        [open]="pendingDelete() !== null"
        [title]="'COMMON.CONFIRM_DELETE' | translate"
        (closed)="pendingDelete.set(null)"
      >
        <p>{{ 'SECRETARIAT.CONFIRM_DELETE' | translate }}</p>
        <div class="mt-4 flex gap-2">
          <button
            class="rounded-md bg-red-700 px-3 py-1.5 text-white hover:bg-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            type="button"
            (click)="confirmDelete(pendingDelete()!)"
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
      </app-dialog>

      @if (loading()) {
        <p class="text-sm text-slate-600" role="status">{{ 'COMMON.LOADING' | translate }}</p>
      } @else if (error()) {
        <p role="alert" class="text-sm text-red-700">{{ 'SECRETARIAT.LOAD_ERROR' | translate }}</p>
      } @else if (records().length === 0) {
        <p class="text-sm text-slate-600">{{ 'SECRETARIAT.EMPTY' | translate }}</p>
      } @else {
        <div class="overflow-x-auto rounded-md border border-slate-200">
          <table class="min-w-full text-left text-sm">
            <caption class="sr-only">
              {{
                'SECRETARIAT.ATTENDANCE_TITLE' | translate
              }}
            </caption>
            <thead class="bg-slate-50 text-slate-700">
              <tr>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'SECRETARIAT.EVENT_DATE' | translate }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'SECRETARIAT.EVENT_TYPE' | translate }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'SECRETARIAT.TOTAL_PRESENT' | translate }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'SECRETARIAT.ADULTS' | translate }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'SECRETARIAT.CHILDREN' | translate }}
                </th>
                @if (canWrite()) {
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'COMMON.ACTIONS' | translate }}
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (record of records(); track record.id) {
                <tr class="border-t border-slate-100">
                  <td class="px-3 py-2 text-slate-700">{{ record.eventDate }}</td>
                  <td class="px-3 py-2 text-slate-700">
                    {{ typeLabel(record.eventType) | translate }}
                  </td>
                  <td class="px-3 py-2 text-slate-900">{{ record.totalPresent }}</td>
                  <td class="px-3 py-2 text-slate-700">
                    {{ record.adults ?? ('COMMON.NOT_AVAILABLE' | translate) }}
                  </td>
                  <td class="px-3 py-2 text-slate-700">
                    {{ record.children ?? ('COMMON.NOT_AVAILABLE' | translate) }}
                  </td>
                  @if (canWrite()) {
                    <td class="px-3 py-2">
                      <div class="flex flex-wrap gap-2">
                        <button
                          class="text-slate-900 underline underline-offset-2 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                          type="button"
                          (click)="openEdit(record)"
                        >
                          {{ 'COMMON.EDIT' | translate }}
                        </button>
                        <button
                          class="text-red-700 underline underline-offset-2 hover:text-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                          type="button"
                          (click)="pendingDelete.set(record.id)"
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
export class AttendanceList implements OnInit {
  readonly #secretariat = inject(SecretariatService);
  readonly #apiError = inject(ApiErrorService);
  readonly #auth = inject(AuthService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly eventTypes = ATTENDANCE_EVENT_TYPES;
  readonly records = signal<IAttendanceRecord[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly showForm = signal(false);
  readonly editing = signal<IAttendanceRecord | null>(null);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly supportHint = signal<string | null>(null);
  readonly pendingDelete = signal<string | null>(null);

  readonly canWrite = computed(() => this.#auth.hasPermission('secretariat:write'));
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));

  readonly filterForm = new FormGroup({
    from: new FormControl('', { nonNullable: true }),
    to: new FormControl('', { nonNullable: true }),
    eventType: new FormControl<AttendanceEventType | ''>('', { nonNullable: true }),
  });

  readonly form = new FormGroup({
    eventDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    eventType: new FormControl(AttendanceEventType.SERVICE, { nonNullable: true }),
    totalPresent: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    adults: new FormControl<number | null>(null, Validators.min(0)),
    children: new FormControl<number | null>(null, Validators.min(0)),
    notes: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.load();
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({
      eventDate: this.#today(),
      eventType: AttendanceEventType.SERVICE,
      totalPresent: null,
      adults: null,
      children: null,
      notes: '',
    });
    this.showForm.set(true);
  }

  openEdit(record: IAttendanceRecord): void {
    this.editing.set(record);
    this.form.reset({
      eventDate: record.eventDate,
      eventType: record.eventType,
      totalPresent: record.totalPresent,
      adults: record.adults,
      children: record.children,
      notes: record.notes ?? '',
    });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editing.set(null);
    this.errorMessage.set(null);
    this.supportHint.set(null);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.#focusFirstInvalid();
      return;
    }
    const v = this.form.getRawValue();
    const payload = {
      eventDate: v.eventDate,
      eventType: v.eventType,
      totalPresent: v.totalPresent as number,
      adults: v.adults,
      children: v.children,
      notes: v.notes || null,
    };
    const request = this.editing()
      ? this.#secretariat.updateAttendance(this.editing()!.id, payload)
      : this.#secretariat.createAttendance(payload);
    this.saving.set(true);
    this.errorMessage.set(null);
    this.supportHint.set(null);
    request.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.load();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        const resolved = this.#apiError.resolve(error);
        this.errorMessage.set(resolved.displayMessage);
        this.supportHint.set(resolved.supportHint ?? null);
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
      .removeAttendance(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.pendingDelete.set(null);
          this.load();
        },
        error: () => this.error.set(true),
      });
  }

  typeLabel(type: AttendanceEventType): string {
    return `SECRETARIAT.ATTENDANCE_TYPE_${type.toUpperCase()}`;
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const v = this.filterForm.getRawValue();
    this.#secretariat
      .attendance({
        page: this.page(),
        limit: PAGE_SIZE,
        from: v.from || undefined,
        to: v.to || undefined,
        eventType: v.eventType || undefined,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (r) => {
          this.records.set(r.data);
          this.total.set(r.total);
          this.page.set(r.page);
          this.loading.set(false);
        },
        error: () => {
          this.records.set([]);
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
