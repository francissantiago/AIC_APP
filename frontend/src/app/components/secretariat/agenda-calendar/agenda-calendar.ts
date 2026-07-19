import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import {
  CalendarDatePipe,
  CalendarEvent,
  CalendarMonthViewComponent,
  CalendarNextViewDirective,
  CalendarPreviousViewDirective,
  CalendarTodayDirective,
  CalendarView,
  CalendarWeekViewComponent,
  CalendarDayViewComponent,
  DateAdapter,
  provideCalendar,
} from 'angular-calendar';
import { AppDialog } from '@components/app-dialog/app-dialog';
import {
  CALENDAR_RECURRENCE_FREQUENCIES,
  CalendarEventType,
  CalendarRecurrenceFrequency,
  MANUAL_CALENDAR_EVENT_TYPES,
} from '@enums/secretariat';
import { ICalendarEvent } from '@interfaces/ISecretariat';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '@services/auth-service';
import { ApiErrorService } from '@services/api-error.service';
import { SecretariatService } from '@services/secretariat-service';
import { endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from 'date-fns';

const EVENT_COLORS: Record<CalendarEventType, { primary: string; secondary: string }> = {
  [CalendarEventType.SERVICE]: { primary: '#0369a1', secondary: '#e0f2fe' },
  [CalendarEventType.MEETING]: { primary: '#9a3412', secondary: '#ffedd5' },
  [CalendarEventType.REHEARSAL]: { primary: '#6b21a8', secondary: '#f3e8ff' },
  [CalendarEventType.WEDDING]: { primary: '#be123c', secondary: '#ffe4e6' },
  [CalendarEventType.OTHER]: { primary: '#334155', secondary: '#e2e8f0' },
  [CalendarEventType.BIRTHDAY]: { primary: '#db2777', secondary: '#fce7f3' },
};

@Component({
  selector: 'app-agenda-calendar',
  imports: [
    AppDialog,
    CalendarDatePipe,
    CalendarDayViewComponent,
    CalendarMonthViewComponent,
    CalendarNextViewDirective,
    CalendarPreviousViewDirective,
    CalendarTodayDirective,
    CalendarWeekViewComponent,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
  ],
  providers: [provideCalendar({ provide: DateAdapter, useFactory: adapterFactory })],
  template: `
    <section class="w-full">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-xl font-semibold text-slate-900">
          {{ 'SECRETARIAT.AGENDA_TITLE' | translate }}
        </h1>
        @if (canWrite()) {
          <button
            class="rounded-md bg-slate-500 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 disabled:opacity-50"
            type="button"
            (click)="openCreate()"
          >
            {{ 'SECRETARIAT.EVENT_NEW' | translate }}
          </button>
        }
      </div>

      <app-dialog
        [(open)]="showForm"
        [title]="(editing() ? 'SECRETARIAT.EVENT_EDIT' : 'SECRETARIAT.EVENT_NEW') | translate"
        (closed)="closeForm()"
      >
        <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-4 md:grid-cols-2" novalidate>
          <label class="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
            <span>{{ 'SECRETARIAT.EVENT_TITLE' | translate }}</span>
            <input
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
              formControlName="title"
              maxlength="150"
              [attr.aria-invalid]="form.controls.title.touched && form.controls.title.invalid"
              [attr.aria-describedby]="
                form.controls.title.touched && form.controls.title.invalid
                  ? 'event-title-error'
                  : null
              "
            />
            @if (form.controls.title.touched && form.controls.title.invalid) {
              <span id="event-title-error" class="text-xs text-red-700">
                {{ 'COMMON.REQUIRED_FIELD' | translate }}
              </span>
            }
          </label>
          <label class="flex flex-col gap-1 text-sm text-slate-700">
            <span>{{ 'SECRETARIAT.EVENT_TYPE' | translate }}</span>
            <select
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
              formControlName="type"
            >
              @for (type of eventTypes; track type) {
                <option [value]="type">{{ typeLabel(type) | translate }}</option>
              }
            </select>
          </label>
          <label class="flex items-center gap-2 self-end text-sm text-slate-700">
            <input type="checkbox" formControlName="allDay" class="size-4" />
            <span>{{ 'SECRETARIAT.ALL_DAY' | translate }}</span>
          </label>
          <label class="flex flex-col gap-1 text-sm text-slate-700">
            <span>{{ 'SECRETARIAT.STARTS_AT' | translate }}</span>
            <input
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
              type="datetime-local"
              formControlName="startsAt"
              [attr.aria-invalid]="form.controls.startsAt.touched && form.controls.startsAt.invalid"
              [attr.aria-describedby]="
                form.controls.startsAt.touched && form.controls.startsAt.invalid
                  ? 'event-starts-error'
                  : null
              "
            />
            @if (form.controls.startsAt.touched && form.controls.startsAt.invalid) {
              <span id="event-starts-error" class="text-xs text-red-700">
                {{ 'COMMON.REQUIRED_FIELD' | translate }}
              </span>
            }
          </label>
          <label class="flex flex-col gap-1 text-sm text-slate-700">
            <span>{{ 'SECRETARIAT.ENDS_AT' | translate }}</span>
            <input
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
              type="datetime-local"
              formControlName="endsAt"
              [attr.aria-invalid]="form.controls.endsAt.touched && form.controls.endsAt.invalid"
              [attr.aria-describedby]="
                form.controls.endsAt.touched && form.controls.endsAt.invalid
                  ? 'event-ends-error'
                  : null
              "
            />
            @if (form.controls.endsAt.touched && form.controls.endsAt.invalid) {
              <span id="event-ends-error" class="text-xs text-red-700">
                {{ 'COMMON.REQUIRED_FIELD' | translate }}
              </span>
            }
            @if (rangeInvalid()) {
              <span class="text-xs text-red-700">
                {{ 'SECRETARIAT.INVALID_EVENT_RANGE' | translate }}
              </span>
            }
          </label>
          <label class="flex flex-col gap-1 text-sm text-slate-700">
            <span>{{ 'SECRETARIAT.LOCATION' | translate }}</span>
            <input
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
              formControlName="location"
              maxlength="150"
            />
          </label>
          <label class="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
            <span>{{ 'SECRETARIAT.DESCRIPTION' | translate }}</span>
            <textarea
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
              rows="3"
              formControlName="description"
            ></textarea>
          </label>
          <label class="flex flex-col gap-1 text-sm text-slate-700">
            <span>{{ 'SECRETARIAT.RECURRENCE' | translate }}</span>
            <select
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
              formControlName="recurrenceFrequency"
            >
              @for (frequency of recurrenceFrequencies; track frequency) {
                <option [value]="frequency">
                  {{ recurrenceLabel(frequency) | translate }}
                </option>
              }
            </select>
          </label>
          @if (form.controls.recurrenceFrequency.value !== recurrenceNone) {
            <label class="flex flex-col gap-1 text-sm text-slate-700">
              <span>{{ 'SECRETARIAT.RECURRENCE_INTERVAL' | translate }}</span>
              <input
                class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
                type="number"
                min="1"
                max="30"
                formControlName="recurrenceInterval"
              />
            </label>
            <label class="flex flex-col gap-1 text-sm text-slate-700">
              <span>{{ 'SECRETARIAT.RECURRENCE_UNTIL' | translate }}</span>
              <input
                class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
                type="date"
                formControlName="recurrenceUntil"
              />
            </label>
          }
          @if (editing()?.isRecurring) {
            <p class="text-sm text-slate-600 md:col-span-2" role="status">
              {{ 'SECRETARIAT.RECURRENCE_EDIT_HINT' | translate }}
            </p>
          }
          @if (isSystemBirthdayEvent()) {
            <p class="text-sm text-slate-600 md:col-span-2" role="status">
              {{ 'SECRETARIAT.BIRTHDAY_EVENT_READONLY' | translate }}
              @if (editing()?.sourceMemberId; as memberId) {
                <a
                  class="ml-1 font-medium text-slate-800 underline hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  [routerLink]="['/members', memberId]"
                >
                  {{ 'SECRETARIAT.OPEN_MEMBER_PROFILE' | translate }}
                </a>
              }
            </p>
          }
          @if (errorMessage(); as message) {
            <p role="alert" class="text-sm text-red-700 md:col-span-2">
              {{ message }}
              @if (supportHint(); as hint) {
                <span class="mt-1 block text-xs opacity-90">{{ hint }}</span>
              }
            </p>
          }
          <div class="mt-2 flex flex-wrap gap-3 md:col-span-2">
            @if (canWrite() && !isSystemBirthdayEvent()) {
              <button
                class="rounded-md bg-slate-500 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 disabled:opacity-50"
                type="submit"
                [disabled]="saving()"
              >
                {{ 'COMMON.SAVE' | translate }}
              </button>
            }
            @if (canWrite() && editing() && !isSystemBirthdayEvent()) {
              <button
                class="rounded-md border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                type="button"
                (click)="pendingDelete.set(editing()!.seriesId)"
              >
                {{ 'COMMON.DELETE' | translate }}
              </button>
            }
            @if (canViewSchedules() && editing()) {
              <a
                class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                [routerLink]="['/secretariat/schedules']"
                [queryParams]="{ eventId: editing()!.id }"
              >
                {{ 'SCHEDULES.OPEN_FROM_AGENDA' | translate }}
              </a>
            }
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

      <app-dialog
        [open]="pendingDelete() !== null"
        [title]="'COMMON.CONFIRM_DELETE' | translate"
        (closed)="pendingDelete.set(null)"
      >
        <p>
          {{
            (editing()?.isRecurring
              ? 'SECRETARIAT.CONFIRM_DELETE_SERIES'
              : 'SECRETARIAT.CONFIRM_DELETE_EVENT'
            ) | translate
          }}
        </p>
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

      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div
          class="flex gap-2"
          role="group"
          [attr.aria-label]="'SECRETARIAT.AGENDA_TITLE' | translate"
        >
          <button
            class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            type="button"
            mwlCalendarPreviousView
            [view]="view()"
            [viewDate]="viewDate()"
            (viewDateChange)="viewDate.set($event)"
          >
            {{ 'COMMON.PREVIOUS' | translate }}
          </button>
          <button
            class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            type="button"
            mwlCalendarToday
            [viewDate]="viewDate()"
            (viewDateChange)="viewDate.set($event)"
          >
            {{ 'SECRETARIAT.TODAY' | translate }}
          </button>
          <button
            class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            type="button"
            mwlCalendarNextView
            [view]="view()"
            [viewDate]="viewDate()"
            (viewDateChange)="viewDate.set($event)"
          >
            {{ 'COMMON.NEXT' | translate }}
          </button>
        </div>
        <h2 class="text-lg font-medium text-slate-900">
          {{ viewDate() | calendarDate: view() + 'ViewTitle' : locale() }}
        </h2>
        <div
          class="flex gap-2"
          role="group"
          [attr.aria-label]="'SECRETARIAT.AGENDA_TITLE' | translate"
        >
          <button
            class="rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            [class.bg-slate-600]="view() === calendarView.Month"
            [class.text-white]="view() === calendarView.Month"
            [class.border-slate-300]="view() !== calendarView.Month"
            [class.bg-white]="view() !== calendarView.Month"
            type="button"
            (click)="view.set(calendarView.Month)"
          >
            {{ 'SECRETARIAT.VIEW_MONTH' | translate }}
          </button>
          <button
            class="rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            [class.bg-slate-600]="view() === calendarView.Week"
            [class.text-white]="view() === calendarView.Week"
            [class.border-slate-300]="view() !== calendarView.Week"
            [class.bg-white]="view() !== calendarView.Week"
            type="button"
            (click)="view.set(calendarView.Week)"
          >
            {{ 'SECRETARIAT.VIEW_WEEK' | translate }}
          </button>
          <button
            class="rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            [class.bg-slate-600]="view() === calendarView.Day"
            [class.text-white]="view() === calendarView.Day"
            [class.border-slate-300]="view() !== calendarView.Day"
            [class.bg-white]="view() !== calendarView.Day"
            type="button"
            (click)="view.set(calendarView.Day)"
          >
            {{ 'SECRETARIAT.VIEW_DAY' | translate }}
          </button>
        </div>
      </div>

      @if (loading()) {
        <p class="text-sm text-slate-600" role="status">{{ 'COMMON.LOADING' | translate }}</p>
      } @else if (error()) {
        <p role="alert" class="text-sm text-red-700">{{ 'SECRETARIAT.LOAD_ERROR' | translate }}</p>
      }

      <div class="rounded-md border border-slate-200 p-2">
        @switch (view()) {
          @case (calendarView.Month) {
            <mwl-calendar-month-view
              [viewDate]="viewDate()"
              [events]="calendarEvents()"
              [locale]="locale()"
              (dayClicked)="onDayClicked($event.day.date)"
              (eventClicked)="onEventClicked($event.event)"
            />
          }
          @case (calendarView.Week) {
            <mwl-calendar-week-view
              [viewDate]="viewDate()"
              [events]="calendarEvents()"
              [locale]="locale()"
              (eventClicked)="onEventClicked($event.event)"
              (hourSegmentClicked)="onSlotClicked($event.date)"
            />
          }
          @case (calendarView.Day) {
            <mwl-calendar-day-view
              [viewDate]="viewDate()"
              [events]="calendarEvents()"
              [locale]="locale()"
              (eventClicked)="onEventClicked($event.event)"
              (hourSegmentClicked)="onSlotClicked($event.date)"
            />
          }
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgendaCalendar implements OnInit {
  readonly #secretariat = inject(SecretariatService);
  readonly #apiError = inject(ApiErrorService);
  readonly #auth = inject(AuthService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #translate = inject(TranslateService);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly calendarView = CalendarView;
  readonly eventTypes = MANUAL_CALENDAR_EVENT_TYPES;
  readonly recurrenceFrequencies = CALENDAR_RECURRENCE_FREQUENCIES;
  readonly recurrenceNone = CalendarRecurrenceFrequency.NONE;

  readonly view = signal<CalendarView>(CalendarView.Month);
  readonly viewDate = signal(new Date());
  readonly events = signal<ICalendarEvent[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly showForm = signal(false);
  readonly editing = signal<ICalendarEvent | null>(null);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly supportHint = signal<string | null>(null);
  readonly pendingDelete = signal<string | null>(null);

  readonly canWrite = computed(() => this.#auth.hasPermission('secretariat:write'));
  readonly canViewSchedules = computed(() => this.#auth.hasPermission('schedules:read'));
  readonly isSystemBirthdayEvent = computed(() =>
    Boolean(this.editing()?.sourceMemberId),
  );
  readonly locale = computed(() => this.#translate.currentLang() || 'en');

  readonly calendarEvents = computed<CalendarEvent<ICalendarEvent>[]>(() =>
    this.events().map((event) => ({
      id: event.id,
      title: event.title,
      start: new Date(event.startsAt),
      end: new Date(event.endsAt),
      allDay: event.allDay,
      meta: event,
      color: EVENT_COLORS[event.type],
    })),
  );

  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    type: new FormControl(CalendarEventType.SERVICE, { nonNullable: true }),
    allDay: new FormControl(false, { nonNullable: true }),
    startsAt: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    endsAt: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    location: new FormControl('', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true }),
    recurrenceFrequency: new FormControl(CalendarRecurrenceFrequency.NONE, {
      nonNullable: true,
    }),
    recurrenceInterval: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.min(1), Validators.max(30)],
    }),
    recurrenceUntil: new FormControl('', { nonNullable: true }),
  });

  readonly rangeInvalid = computed(() => {
    const v = this.form.getRawValue();
    return Boolean(v.startsAt && v.endsAt && v.endsAt < v.startsAt);
  });

  constructor() {
    effect(() => {
      const view = this.view();
      const date = this.viewDate();
      this.#load(view, date);
    });
  }

  ngOnInit(): void {
    this.#load(this.view(), this.viewDate());
  }

  openCreate(date?: Date): void {
    if (!this.canWrite()) {
      return;
    }
    this.editing.set(null);
    const start = date ? new Date(date) : new Date();
    if (date) {
      start.setHours(19, 0, 0, 0);
    }
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    this.form.reset({
      title: '',
      type: CalendarEventType.SERVICE,
      allDay: false,
      startsAt: this.#toLocalInput(start),
      endsAt: this.#toLocalInput(end),
      location: '',
      description: '',
      recurrenceFrequency: CalendarRecurrenceFrequency.NONE,
      recurrenceInterval: 1,
      recurrenceUntil: '',
    });
    this.form.enable({ emitEvent: false });
    this.showForm.set(true);
  }

  openEdit(event: ICalendarEvent): void {
    const seriesId = event.seriesId || event.id;
    this.#secretariat
      .calendarEvent(seriesId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (master) => {
          this.editing.set(master);
          this.form.reset({
            title: master.title,
            type: master.type,
            allDay: master.allDay,
            startsAt: this.#toLocalInput(new Date(master.startsAt)),
            endsAt: this.#toLocalInput(new Date(master.endsAt)),
            location: master.location ?? '',
            description: master.description ?? '',
            recurrenceFrequency: master.recurrenceFrequency,
            recurrenceInterval: master.recurrenceInterval || 1,
            recurrenceUntil: master.recurrenceUntil ?? '',
          });
          this.#syncFormEditability();
          this.showForm.set(true);
        },
        error: () => {
          this.editing.set(event);
          this.form.reset({
            title: event.title,
            type: event.type,
            allDay: event.allDay,
            startsAt: this.#toLocalInput(new Date(event.startsAt)),
            endsAt: this.#toLocalInput(new Date(event.endsAt)),
            location: event.location ?? '',
            description: event.description ?? '',
            recurrenceFrequency: event.recurrenceFrequency,
            recurrenceInterval: event.recurrenceInterval || 1,
            recurrenceUntil: event.recurrenceUntil ?? '',
          });
          this.#syncFormEditability();
          this.showForm.set(true);
        },
      });
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editing.set(null);
    this.errorMessage.set(null);
    this.supportHint.set(null);
  }

  onDayClicked(date: Date): void {
    if (this.canWrite()) {
      this.openCreate(date);
    }
  }

  onSlotClicked(date: Date): void {
    if (this.canWrite()) {
      this.openCreate(date);
    }
  }

  onEventClicked(event: CalendarEvent<ICalendarEvent>): void {
    if (
      event.meta &&
      (this.canWrite() || this.canViewSchedules() || event.meta.sourceMemberId)
    ) {
      this.openEdit(event.meta);
    }
  }

  submit(): void {
    if (!this.canWrite()) {
      return;
    }
    if (this.form.invalid || this.rangeInvalid()) {
      this.form.markAllAsTouched();
      this.#focusFirstInvalid();
      return;
    }
    const v = this.form.getRawValue();
    const payload = {
      title: v.title,
      type: v.type,
      allDay: v.allDay,
      startsAt: new Date(v.startsAt).toISOString(),
      endsAt: new Date(v.endsAt).toISOString(),
      location: v.location || null,
      description: v.description || null,
      recurrenceFrequency: v.recurrenceFrequency,
      recurrenceInterval: Number(v.recurrenceInterval) || 1,
      recurrenceUntil:
        v.recurrenceFrequency === CalendarRecurrenceFrequency.NONE
          ? null
          : v.recurrenceUntil || null,
    };
    const seriesId = this.editing()?.seriesId ?? this.editing()?.id;
    const request = seriesId
      ? this.#secretariat.updateCalendarEvent(seriesId, payload)
      : this.#secretariat.createCalendarEvent(payload);
    this.saving.set(true);
    this.errorMessage.set(null);
    this.supportHint.set(null);
    request.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.#load(this.view(), this.viewDate());
      },
      error: (error: unknown) => {
        this.saving.set(false);
        const resolved = this.#apiError.resolve(error);
        this.errorMessage.set(resolved.displayMessage);
        this.supportHint.set(resolved.supportHint ?? null);
      },
    });
  }

  confirmDelete(id: string): void {
    const seriesId =
      this.editing()?.seriesId ??
      this.events().find((event) => event.id === id || event.seriesId === id)?.seriesId ??
      id;
    this.#secretariat
      .removeCalendarEvent(seriesId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.pendingDelete.set(null);
          this.closeForm();
          this.#load(this.view(), this.viewDate());
        },
        error: () => this.error.set(true),
      });
  }

  typeLabel(type: CalendarEventType): string {
    return `SECRETARIAT.EVENT_TYPE_${type.toUpperCase()}`;
  }

  recurrenceLabel(frequency: CalendarRecurrenceFrequency): string {
    return `SECRETARIAT.RECURRENCE_${frequency.toUpperCase()}`;
  }

  #load(view: CalendarView, date: Date): void {
    const { from, to } = this.#rangeFor(view, date);
    this.loading.set(true);
    this.error.set(false);
    this.#secretariat
      .calendarEvents({ from: from.toISOString(), to: to.toISOString(), page: 1, limit: 100 })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (result) => {
          this.events.set(result.data);
          this.loading.set(false);
        },
        error: () => {
          this.events.set([]);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }

  #rangeFor(view: CalendarView, date: Date): { from: Date; to: Date } {
    switch (view) {
      case CalendarView.Week:
        return { from: startOfWeek(date), to: endOfWeek(date) };
      case CalendarView.Day:
        return { from: startOfDay(date), to: endOfDay(date) };
      default:
        return { from: startOfMonth(date), to: endOfMonth(date) };
    }
  }

  #toLocalInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  #syncFormEditability(): void {
    if (this.canWrite() && !this.isSystemBirthdayEvent()) {
      this.form.enable({ emitEvent: false });
    } else {
      this.form.disable({ emitEvent: false });
    }
  }

  #focusFirstInvalid(): void {
    queueMicrotask(() => {
      this.#host.nativeElement
        .querySelector<HTMLElement>('input.ng-invalid, select.ng-invalid, textarea.ng-invalid')
        ?.focus();
    });
  }
}
