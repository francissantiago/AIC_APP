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
import {
  SECRETARIAT_DOCUMENT_STATUSES,
  SECRETARIAT_DOCUMENT_TYPES,
  SecretariatDocumentStatus,
  SecretariatDocumentType,
} from '@enums/secretariat';
import { SECRETARIAT_WRITE_ROLES, hasAnyRole } from '@guards/role-guard';
import { ISecretariatDocument } from '@interfaces/ISecretariat';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '@services/auth-service';
import { ApiErrorService } from '@services/api-error.service';
import { SecretariatService } from '@services/secretariat-service';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-documents-list',
  imports: [AppDialog, ReactiveFormsModule, TranslatePipe],
  template: `
    <section class="w-full">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-xl font-semibold text-slate-900">
          {{ 'SECRETARIAT.DOCUMENTS_TITLE' | translate }}
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
          <label class="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
            <span>{{ 'SECRETARIAT.DOC_TITLE' | translate }}</span>
            <input
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
              formControlName="title"
              maxlength="200"
              [attr.aria-invalid]="form.controls.title.touched && form.controls.title.invalid"
              [attr.aria-describedby]="
                form.controls.title.touched && form.controls.title.invalid
                  ? 'document-title-error'
                  : null
              "
            />
            @if (form.controls.title.touched && form.controls.title.invalid) {
              <span id="document-title-error" class="text-xs text-red-700">
                {{ 'COMMON.REQUIRED_FIELD' | translate }}
              </span>
            }
          </label>
          <label class="flex flex-col gap-1 text-sm text-slate-700">
            <span>{{ 'SECRETARIAT.DOC_TYPE' | translate }}</span>
            <select
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
              formControlName="type"
            >
              @for (type of documentTypes; track type) {
                <option [value]="type">{{ typeLabel(type) | translate }}</option>
              }
            </select>
          </label>
          <label class="flex flex-col gap-1 text-sm text-slate-700">
            <span>{{ 'SECRETARIAT.DOCUMENT_DATE' | translate }}</span>
            <input
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
              type="date"
              formControlName="documentDate"
              [attr.aria-invalid]="
                form.controls.documentDate.touched && form.controls.documentDate.invalid
              "
              [attr.aria-describedby]="
                form.controls.documentDate.touched && form.controls.documentDate.invalid
                  ? 'document-date-error'
                  : null
              "
            />
            @if (form.controls.documentDate.touched && form.controls.documentDate.invalid) {
              <span id="document-date-error" class="text-xs text-red-700">
                {{ 'COMMON.REQUIRED_FIELD' | translate }}
              </span>
            }
          </label>
          <label class="flex flex-col gap-1 text-sm text-slate-700">
            <span>{{ 'SECRETARIAT.STATUS' | translate }}</span>
            <select
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
              formControlName="status"
            >
              @for (status of documentStatuses; track status) {
                <option [value]="status">{{ statusLabel(status) | translate }}</option>
              }
            </select>
          </label>
          <label class="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
            <span>{{ 'SECRETARIAT.SUMMARY' | translate }}</span>
            <textarea
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
              rows="5"
              formControlName="summary"
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
        class="mb-4 grid gap-3 md:grid-cols-5"
        [attr.aria-label]="'COMMON.FILTER' | translate"
      >
        <label class="flex min-w-0 flex-col gap-1 text-sm text-slate-700">
          <span>{{ 'COMMON.SEARCH' | translate }}</span>
          <input
            class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            type="search"
            formControlName="search"
          />
        </label>
        <label class="flex min-w-0 flex-col gap-1 text-sm text-slate-700">
          <span>{{ 'SECRETARIAT.DOC_TYPE' | translate }}</span>
          <select
            class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            formControlName="type"
          >
            <option value="">{{ 'COMMON.FILTER' | translate }}</option>
            @for (type of documentTypes; track type) {
              <option [value]="type">{{ typeLabel(type) | translate }}</option>
            }
          </select>
        </label>
        <label class="flex min-w-0 flex-col gap-1 text-sm text-slate-700">
          <span>{{ 'SECRETARIAT.STATUS' | translate }}</span>
          <select
            class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            formControlName="status"
          >
            <option value="">{{ 'COMMON.FILTER' | translate }}</option>
            @for (status of documentStatuses; track status) {
              <option [value]="status">{{ statusLabel(status) | translate }}</option>
            }
          </select>
        </label>
        <label class="flex min-w-0 flex-col gap-1 text-sm text-slate-700">
          <span>{{ 'SECRETARIAT.FROM' | translate }}</span>
          <input
            class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            type="date"
            formControlName="from"
          />
        </label>
        <div class="flex items-end gap-2">
          <label class="flex min-w-0 flex-1 flex-col gap-1 text-sm text-slate-700">
            <span>{{ 'SECRETARIAT.TO' | translate }}</span>
            <input
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
              type="date"
              formControlName="to"
            />
          </label>
          <button
            class="rounded-md bg-slate-500 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 disabled:opacity-50"
            type="submit"
          >
            {{ 'COMMON.FILTER' | translate }}
          </button>
        </div>
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
      } @else if (documents().length === 0) {
        <p class="text-sm text-slate-600">{{ 'SECRETARIAT.EMPTY' | translate }}</p>
      } @else {
        <div class="overflow-x-auto rounded-md border border-slate-200">
          <table class="min-w-full text-left text-sm">
            <caption class="sr-only">
              {{
                'SECRETARIAT.DOCUMENTS_TITLE' | translate
              }}
            </caption>
            <thead class="bg-slate-50 text-slate-700">
              <tr>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'SECRETARIAT.DOC_TITLE' | translate }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'SECRETARIAT.DOC_TYPE' | translate }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'SECRETARIAT.DOCUMENT_DATE' | translate }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'SECRETARIAT.STATUS' | translate }}
                </th>
                @if (canWrite()) {
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'COMMON.ACTIONS' | translate }}
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (doc of documents(); track doc.id) {
                <tr class="border-t border-slate-100">
                  <td class="px-3 py-2 text-slate-900">{{ doc.title }}</td>
                  <td class="px-3 py-2 text-slate-700">{{ typeLabel(doc.type) | translate }}</td>
                  <td class="px-3 py-2 text-slate-700">{{ doc.documentDate }}</td>
                  <td class="px-3 py-2 text-slate-700">
                    {{ statusLabel(doc.status) | translate }}
                  </td>
                  @if (canWrite()) {
                    <td class="px-3 py-2">
                      <div class="flex flex-wrap gap-2">
                        <button
                          class="text-slate-900 underline underline-offset-2 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                          type="button"
                          (click)="openEdit(doc)"
                        >
                          {{ 'COMMON.EDIT' | translate }}
                        </button>
                        <button
                          class="text-red-700 underline underline-offset-2 hover:text-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                          type="button"
                          (click)="pendingDelete.set(doc.id)"
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
export class DocumentsList implements OnInit {
  readonly #secretariat = inject(SecretariatService);
  readonly #apiError = inject(ApiErrorService);
  readonly #auth = inject(AuthService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly documentTypes = SECRETARIAT_DOCUMENT_TYPES;
  readonly documentStatuses = SECRETARIAT_DOCUMENT_STATUSES;
  readonly documents = signal<ISecretariatDocument[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly showForm = signal(false);
  readonly editing = signal<ISecretariatDocument | null>(null);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly supportHint = signal<string | null>(null);
  readonly pendingDelete = signal<string | null>(null);

  readonly canWrite = computed(() =>
    hasAnyRole(this.#auth.currentUser()?.roles.map((r) => r.code) ?? [], SECRETARIAT_WRITE_ROLES),
  );
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));

  readonly filterForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    type: new FormControl<SecretariatDocumentType | ''>('', { nonNullable: true }),
    status: new FormControl<SecretariatDocumentStatus | ''>('', { nonNullable: true }),
    from: new FormControl('', { nonNullable: true }),
    to: new FormControl('', { nonNullable: true }),
  });

  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    type: new FormControl(SecretariatDocumentType.MINUTES, { nonNullable: true }),
    documentDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    status: new FormControl(SecretariatDocumentStatus.DRAFT, { nonNullable: true }),
    summary: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.load();
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({
      title: '',
      type: SecretariatDocumentType.MINUTES,
      documentDate: this.#today(),
      status: SecretariatDocumentStatus.DRAFT,
      summary: '',
    });
    this.showForm.set(true);
  }

  openEdit(doc: ISecretariatDocument): void {
    this.editing.set(doc);
    this.form.reset({
      title: doc.title,
      type: doc.type,
      documentDate: doc.documentDate,
      status: doc.status,
      summary: doc.summary ?? '',
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
      title: v.title,
      type: v.type,
      documentDate: v.documentDate,
      status: v.status,
      summary: v.summary || null,
    };
    const request = this.editing()
      ? this.#secretariat.updateDocument(this.editing()!.id, payload)
      : this.#secretariat.createDocument(payload);
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
      .removeDocument(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.pendingDelete.set(null);
          this.load();
        },
        error: () => this.error.set(true),
      });
  }

  typeLabel(type: SecretariatDocumentType): string {
    return `SECRETARIAT.DOC_TYPE_${type.toUpperCase()}`;
  }

  statusLabel(status: SecretariatDocumentStatus): string {
    return `SECRETARIAT.STATUS_${status.toUpperCase()}`;
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const v = this.filterForm.getRawValue();
    this.#secretariat
      .documents({
        page: this.page(),
        limit: PAGE_SIZE,
        search: v.search.trim() || undefined,
        type: v.type || undefined,
        status: v.status || undefined,
        from: v.from || undefined,
        to: v.to || undefined,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (r) => {
          this.documents.set(r.data);
          this.total.set(r.total);
          this.page.set(r.page);
          this.loading.set(false);
        },
        error: () => {
          this.documents.set([]);
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
