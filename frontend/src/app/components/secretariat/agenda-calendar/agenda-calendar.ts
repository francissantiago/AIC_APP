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
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import {
  CalendarDateFormatter,
  CalendarDatePipe,
  CalendarEvent,
  CalendarMonthViewComponent,
  CalendarNextViewDirective,
  CalendarPreviousViewDirective,
  CalendarTodayDirective,
  CalendarView,
  CalendarWeekViewComponent,
  DateAdapter,
  provideCalendar,
} from 'angular-calendar';
import { AppDialog } from '@components/app-dialog/app-dialog';
import { GoogleCalendarPanel } from '@components/secretariat/google-calendar-panel/google-calendar-panel';
import {
  CALENDAR_RECURRENCE_FREQUENCIES,
  CalendarEventType,
  CalendarRecurrenceFrequency,
  MANUAL_CALENDAR_EVENT_TYPES,
} from '@enums/secretariat';
import { ICalendarEvent, IImportCalendarEventsResponse } from '@interfaces/ISecretariat';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '@services/auth-service';
import { ApiErrorService } from '@services/api-error.service';
import { SecretariatService } from '@services/secretariat-service';
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import {
  AGENDA_WEEK_STARTS_ON,
  buildAgendaPrintHtml,
  calendarDisplayColor,
  formatEventPreviewWhen,
  groupEventsForAgendaPrint,
  isCrossMidnightSameDayEnd,
  isEventRangeInvalid,
  isMonthBannerEvent as isMonthBannerEventUtil,
  normalizeEventRange,
  previewMonthViewEvents,
  remainingMonthViewEventsCount,
  spansMidnight,
  weekHeaderDayNumber as formatWeekHeaderDayNumber,
  weekHeaderWeekday as formatWeekHeaderWeekday,
} from './agenda-calendar.util';

const EVENT_COLORS: Record<
  CalendarEventType,
  { primary: string; secondary: string; secondaryText: string }
> = {
  [CalendarEventType.SERVICE]: {
    primary: '#0369a1',
    secondary: '#e0f2fe',
    secondaryText: '#0c4a6e',
  },
  [CalendarEventType.MEETING]: {
    primary: '#9a3412',
    secondary: '#ffedd5',
    secondaryText: '#7c2d12',
  },
  [CalendarEventType.REHEARSAL]: {
    primary: '#6b21a8',
    secondary: '#f3e8ff',
    secondaryText: '#581c87',
  },
  [CalendarEventType.WEDDING]: {
    primary: '#be123c',
    secondary: '#ffe4e6',
    secondaryText: '#9f1239',
  },
  [CalendarEventType.OTHER]: { primary: '#334155', secondary: '#e2e8f0', secondaryText: '#1e293b' },
  [CalendarEventType.BIRTHDAY]: {
    primary: '#db2777',
    secondary: '#fce7f3',
    secondaryText: '#9d174d',
  },
};

@Component({
  selector: 'app-agenda-calendar',
  imports: [
    AppDialog,
    CalendarDatePipe,
    CalendarMonthViewComponent,
    CalendarNextViewDirective,
    CalendarPreviousViewDirective,
    CalendarTodayDirective,
    CalendarWeekViewComponent,
    GoogleCalendarPanel,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
  ],
  providers: [provideCalendar({ provide: DateAdapter, useFactory: adapterFactory })],
  styleUrl: './agenda-calendar.scss',
  template: `
    <ng-template
      #monthCellTemplate
      let-day="day"
      let-locale="locale"
      let-eventClicked="eventClicked"
    >
      <div class="agenda-month-cell">
        <span
          class="agenda-month-day-number"
          [class.agenda-month-day-number-today]="day.isToday"
          [class.agenda-month-day-number-outside]="!day.inMonth"
        >
          {{ day.date | calendarDate: 'monthViewDayNumber' : locale }}
        </span>
        @if (day.events.length > 0) {
          <div class="agenda-month-events">
            @for (event of monthEventsPreview(day.events); track event.id ?? event.title) {
              @if (isMonthBannerEvent(event)) {
                <button
                  type="button"
                  class="agenda-month-all-day-event"
                  [style.background-color]="event.color?.primary"
                  [attr.aria-label]="eventLabel(event)"
                  (click)="onMonthEventClicked(event, $event, eventClicked)"
                >
                  {{ event.title }}
                </button>
              } @else {
                <button
                  type="button"
                  class="agenda-month-timed-event"
                  [attr.aria-label]="eventLabel(event)"
                  (click)="onMonthEventClicked(event, $event, eventClicked)"
                >
                  <span
                    class="agenda-month-event-dot"
                    [style.background-color]="event.color?.primary"
                    aria-hidden="true"
                  ></span>
                  <span class="agenda-month-timed-label">{{ monthTimedEventLabel(event) }}</span>
                </button>
              }
            }
            @if (remainingMonthEventsCount(day.events.length) > 0) {
              <button
                type="button"
                class="agenda-month-event-more"
                data-testid="agenda-month-more-events"
                [attr.aria-label]="moreEventsAriaLabel(day.events.length)"
                (click)="openDayView(day.date, $event)"
              >
                {{
                  'SECRETARIAT.MORE_EVENTS'
                    | translate: { count: remainingMonthEventsCount(day.events.length) }
                }}
              </button>
            }
          </div>
        }
      </div>
    </ng-template>

    <ng-template #calendarEventTitleTemplate let-event="event">
      <span class="agenda-event-title">
        <span class="agenda-event-name">{{ event.title }}</span>
        @if (!event.allDay) {
          <span class="agenda-event-title-time">{{
            formatEventTimeRange(event.start, event.end)
          }}</span>
        }
      </span>
    </ng-template>

    <ng-template
      #weekHeaderTemplate
      let-days="days"
      let-locale="locale"
      let-dayHeaderClicked="dayHeaderClicked"
      let-eventDropped="eventDropped"
      let-dragEnter="dragEnter"
    >
      <div class="cal-day-headers agenda-week-headers" role="row">
        @for (day of days; track day.date.toISOString()) {
          <div
            class="cal-header agenda-week-header"
            [class.cal-past]="day.isPast"
            [class.cal-today]="day.isToday"
            [class.cal-future]="day.isFuture"
            [class.cal-weekend]="day.isWeekend"
            tabindex="0"
            role="columnheader"
            (click)="dayHeaderClicked.emit({ day: day, sourceEvent: $event })"
          >
            <span class="agenda-week-header-weekday">{{ weekHeaderWeekday(day.date) }}</span>
            <span
              class="agenda-week-header-date"
              [class.agenda-week-header-date-today]="day.isToday"
            >
              {{ weekHeaderDayNumber(day.date) }}
            </span>
          </div>
        }
      </div>
    </ng-template>

    <ng-template #allDayEventsLabelTemplate>
      <span class="agenda-week-all-day-label">{{ 'SECRETARIAT.ALL_DAY_SHORT' | translate }}</span>
    </ng-template>

    <section class="w-full" data-testid="agenda-calendar">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-xl font-semibold text-slate-900">
          {{ 'SECRETARIAT.AGENDA_TITLE' | translate }}
        </h1>
        <div class="flex flex-wrap items-center gap-2">
          <button
            class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50"
            type="button"
            data-testid="agenda-export-range-ics"
            [disabled]="icsBusy()"
            [attr.aria-label]="'SECRETARIAT.AGENDA.ICS.EXPORT_RANGE' | translate"
            [attr.title]="'SECRETARIAT.AGENDA.ICS.INCLUDE_BIRTHDAYS_HINT' | translate"
            (click)="exportCurrentViewIcs()"
          >
            {{ 'SECRETARIAT.AGENDA.ICS.EXPORT_RANGE' | translate }}
          </button>
          @if (canWrite()) {
            <button
              class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50"
              type="button"
              data-testid="agenda-import-ics"
              [disabled]="icsBusy()"
              [attr.aria-label]="'SECRETARIAT.AGENDA.ICS.IMPORT' | translate"
              (click)="triggerImportIcs()"
            >
              {{ 'SECRETARIAT.AGENDA.ICS.IMPORT' | translate }}
            </button>
            <input
              #icsFileInput
              class="sr-only"
              type="file"
              accept=".ics,text/calendar"
              data-testid="agenda-import-ics-input"
              [attr.aria-label]="'SECRETARIAT.AGENDA.ICS.FILE_INPUT_LABEL' | translate"
              (change)="onIcsFileSelected($event)"
            />
            <button
              class="rounded-md bg-slate-500 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 disabled:opacity-50"
              type="button"
              data-testid="agenda-create-btn"
              (click)="openCreate()"
            >
              {{ 'SECRETARIAT.EVENT_NEW' | translate }}
            </button>
          }
        </div>
      </div>

      <app-google-calendar-panel (eventsChanged)="reloadAgendaFromGoogleSync()" />

      @if (icsFeedback(); as feedback) {
        <p
          class="mb-3 text-sm"
          [class.text-red-700]="feedback.tone === 'error'"
          [class.text-slate-700]="feedback.tone !== 'error'"
          [attr.role]="feedback.tone === 'error' ? 'alert' : 'status'"
          data-testid="agenda-ics-feedback"
        >
          {{ feedback.message }}
        </p>
      }

      @if (previewEvent(); as preview) {
        <div
          class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/35 p-4"
          data-testid="agenda-event-preview-backdrop"
          (click)="closePreview()"
        >
          <div
            class="max-h-[min(90vh,40rem)] w-full max-w-md overflow-auto rounded-[1.25rem] bg-slate-50 shadow-xl"
            role="dialog"
            aria-modal="true"
            data-testid="agenda-event-preview"
            [attr.aria-label]="'SECRETARIAT.EVENT_PREVIEW' | translate"
            (click)="$event.stopPropagation()"
          >
            <div class="flex justify-end gap-1.5 px-3 pt-3">
              @if (canWrite() && !preview.sourceMemberId) {
                <button
                  type="button"
                  class="inline-flex size-9 items-center justify-center rounded-full bg-slate-600 text-white hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  data-testid="agenda-event-preview-edit"
                  [attr.aria-label]="'COMMON.EDIT' | translate"
                  [attr.title]="'COMMON.EDIT' | translate"
                  (click)="editFromPreview()"
                >
                  <svg
                    class="size-[1.05rem]"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  class="inline-flex size-9 items-center justify-center rounded-full bg-slate-600 text-white hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  data-testid="agenda-event-preview-delete"
                  [attr.aria-label]="'COMMON.DELETE' | translate"
                  [attr.title]="'COMMON.DELETE' | translate"
                  (click)="deleteFromPreview()"
                >
                  <svg
                    class="size-[1.05rem]"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              }
              <button
                type="button"
                class="inline-flex size-9 items-center justify-center rounded-full bg-slate-600 text-white hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50"
                data-testid="agenda-event-preview-export-ics"
                [disabled]="icsBusy()"
                [attr.aria-label]="'SECRETARIAT.AGENDA.ICS.EXPORT_EVENT' | translate"
                [attr.title]="'SECRETARIAT.AGENDA.ICS.EXPORT_EVENT' | translate"
                (click)="exportPreviewEventIcs()"
              >
                <svg
                  class="size-[1.05rem]"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M12 3v12" />
                  <path d="m7 10 5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>
              </button>
              <button
                type="button"
                class="inline-flex size-9 items-center justify-center rounded-full bg-slate-600 text-white hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                data-testid="agenda-event-preview-print"
                [attr.aria-label]="'SECRETARIAT.EVENT_PRINT' | translate"
                [attr.title]="'SECRETARIAT.EVENT_PRINT' | translate"
                (click)="printPreview()"
              >
                <svg
                  class="size-[1.05rem]"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M6 9V3h12v6" />
                  <path
                    d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
                  />
                  <path d="M6 14h12v7H6z" />
                </svg>
              </button>
              <button
                type="button"
                class="inline-flex size-9 items-center justify-center rounded-full bg-slate-600 text-white hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                data-testid="agenda-event-preview-close"
                [attr.aria-label]="'COMMON.DIALOG.CLOSE' | translate"
                [attr.title]="'COMMON.DIALOG.CLOSE' | translate"
                (click)="closePreview()"
              >
                <svg
                  class="size-[1.05rem]"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="flex flex-col gap-3 px-5 pb-6 pt-2">
              <div class="flex items-start gap-3">
                <span
                  class="mt-1.5 size-3.5 shrink-0 rounded"
                  [style.background-color]="eventColor(preview.type).primary"
                  aria-hidden="true"
                ></span>
                <h2 class="m-0 text-[1.375rem] font-semibold leading-tight text-slate-900">
                  {{ preview.title }}
                </h2>
              </div>

              <p class="m-0 ml-[1.625rem] text-sm leading-snug text-slate-600">
                {{ previewWhenLabel(preview) }}
              </p>

              @if (preview.recurrenceFrequency !== recurrenceNone) {
                <p class="m-0 ml-[1.625rem] text-sm leading-snug text-slate-600">
                  {{ recurrenceLabel(preview.recurrenceFrequency) | translate }}
                  @if (preview.recurrenceInterval > 1) {
                    <span> · {{ preview.recurrenceInterval }}</span>
                  }
                </p>
              }

              <div class="flex items-start gap-3 text-sm leading-snug text-slate-700">
                <svg
                  class="mt-0.5 size-[1.125rem] shrink-0 text-slate-500"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M16 3v4M8 3v4M3 11h18" />
                </svg>
                <span>{{ typeLabel(preview.type) | translate }}</span>
              </div>

              @if (preview.location) {
                <div class="flex items-start gap-3 text-sm leading-snug text-slate-700">
                  <svg
                    class="mt-0.5 size-[1.125rem] shrink-0 text-slate-500"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11Z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                  <span>{{ preview.location }}</span>
                </div>
              }

              @if (preview.description) {
                <div class="flex items-start gap-3 text-sm leading-snug text-slate-700">
                  <svg
                    class="mt-0.5 size-[1.125rem] shrink-0 text-slate-500"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                  </svg>
                  <span class="whitespace-pre-wrap">{{ preview.description }}</span>
                </div>
              }

              @if (preview.sourceMemberId) {
                <p class="m-0 text-[0.8125rem] text-slate-600" role="status">
                  {{ 'SECRETARIAT.BIRTHDAY_EVENT_READONLY' | translate }}
                  <a
                    class="font-medium text-blue-600 underline"
                    [routerLink]="['/members', preview.sourceMemberId]"
                  >
                    {{ 'SECRETARIAT.OPEN_MEMBER_PROFILE' | translate }}
                  </a>
                </p>
              }

              @if (canViewSchedules()) {
                <a
                  class="inline-block text-sm font-medium text-blue-600 underline"
                  [routerLink]="['/secretariat/schedules']"
                  [queryParams]="{ eventId: preview.id }"
                >
                  {{ 'SCHEDULES.OPEN_FROM_AGENDA' | translate }}
                </a>
              }
            </div>
          </div>
        </div>
      }

      <app-dialog
        [(open)]="showForm"
        [title]="(editing() ? 'SECRETARIAT.EVENT_EDIT' : 'SECRETARIAT.EVENT_NEW') | translate"
        (closed)="closeForm()"
      >
        <form
          [formGroup]="form"
          (ngSubmit)="submit()"
          class="grid gap-4 md:grid-cols-2"
          novalidate
          data-testid="agenda-form"
        >
          <label class="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
            <span>{{ 'SECRETARIAT.EVENT_TITLE' | translate }}</span>
            <input
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
              formControlName="title"
              maxlength="150"
              data-testid="agenda-form-title"
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
              data-testid="agenda-form-starts"
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
              data-testid="agenda-form-ends"
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
            @if (crossMidnightHint()) {
              <span
                class="text-xs text-slate-600"
                role="status"
                data-testid="agenda-cross-midnight-hint"
              >
                {{ 'SECRETARIAT.CROSS_MIDNIGHT_HINT' | translate }}
              </span>
            }
            @if (spansMidnightHint()) {
              <span
                class="text-xs text-slate-600"
                role="status"
                data-testid="agenda-spans-midnight-hint"
              >
                {{ 'SECRETARIAT.EVENT_SPANS_MIDNIGHT' | translate }}
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
            <p
              class="text-sm text-slate-600 md:col-span-2"
              role="status"
              data-testid="agenda-birthday-readonly"
            >
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
                data-testid="agenda-form-save"
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
            (deleteTargetIsRecurring()
              ? 'SECRETARIAT.CONFIRM_DELETE_SERIES'
              : 'SECRETARIAT.CONFIRM_DELETE_EVENT'
            ) | translate
          }}
        </p>
        <div class="mt-4 flex gap-2">
          <button
            class="rounded-md bg-red-700 px-3 py-1.5 text-white hover:bg-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            type="button"
            data-testid="dialog-confirm"
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
          {{ viewDate() | calendarDate: view() + 'ViewTitle' : locale() : weekStartsOn }}
        </h2>
        <div
          class="flex gap-2"
          role="group"
          [attr.aria-label]="'SECRETARIAT.AGENDA_TITLE' | translate"
        >
          <button
            class="rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
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
            class="rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
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
            class="rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            [class.bg-slate-600]="view() === calendarView.Day"
            [class.text-white]="view() === calendarView.Day"
            [class.border-slate-300]="view() !== calendarView.Day"
            [class.bg-white]="view() !== calendarView.Day"
            type="button"
            (click)="view.set(calendarView.Day)"
          >
            {{ 'SECRETARIAT.VIEW_DAY' | translate }}
          </button>
          <button
            class="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            type="button"
            data-testid="agenda-print-view"
            [attr.aria-label]="'SECRETARIAT.PRINT_CALENDAR' | translate"
            [attr.title]="'SECRETARIAT.PRINT_CALENDAR' | translate"
            (click)="printCalendarView()"
          >
            <svg
              class="size-4"
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M6 9V3h12v6" />
              <path
                d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
              />
              <path d="M6 14h12v7H6z" />
            </svg>
            {{ 'SECRETARIAT.PRINT_CALENDAR' | translate }}
          </button>
        </div>
      </div>

      @if (loading()) {
        <p class="text-sm text-slate-600" role="status">{{ 'COMMON.LOADING' | translate }}</p>
      } @else if (error()) {
        <p role="alert" class="text-sm text-red-700">{{ 'SECRETARIAT.LOAD_ERROR' | translate }}</p>
      }

      <div
        class="agenda-calendar-surface rounded-md border border-slate-200 p-2"
        data-testid="agenda-calendar-view"
      >
        @switch (view()) {
          @case (calendarView.Month) {
            <mwl-calendar-month-view
              [viewDate]="viewDate()"
              [events]="calendarEvents()"
              [locale]="locale()"
              [weekStartsOn]="weekStartsOn"
              [cellTemplate]="monthCellTemplate"
              (dayClicked)="onDayClicked($event.day.date)"
              (eventClicked)="onEventClicked($event.event)"
            />
          }
          @case (calendarView.Week) {
            <div
              class="max-h-[70vh] overflow-y-auto"
              data-testid="agenda-calendar-scroll"
              #agendaScroll
            >
              <mwl-calendar-week-view
                [viewDate]="viewDate()"
                [events]="calendarEvents()"
                [locale]="locale()"
                [weekStartsOn]="weekStartsOn"
                [dayStartHour]="dayStartHour"
                [dayStartMinute]="dayStartMinute"
                [dayEndHour]="dayEndHour"
                [dayEndMinute]="dayEndMinute"
                [hourSegments]="hourSegments"
                [hourSegmentHeight]="hourSegmentHeight"
                [headerTemplate]="weekHeaderTemplate"
                [allDayEventsLabelTemplate]="allDayEventsLabelTemplate"
                [eventTitleTemplate]="calendarEventTitleTemplate"
                (eventClicked)="onEventClicked($event.event)"
                (hourSegmentClicked)="onSlotClicked($event.date)"
              />
            </div>
          }
          @case (calendarView.Day) {
            <div
              class="agenda-day-view max-h-[70vh] overflow-y-auto"
              data-testid="agenda-calendar-scroll"
              #agendaScroll
            >
              <mwl-calendar-week-view
                [viewDate]="viewDate()"
                [events]="calendarEvents()"
                [locale]="locale()"
                [weekStartsOn]="weekStartsOn"
                [daysInWeek]="1"
                [dayStartHour]="dayStartHour"
                [dayStartMinute]="dayStartMinute"
                [dayEndHour]="dayEndHour"
                [dayEndMinute]="dayEndMinute"
                [hourSegments]="hourSegments"
                [hourSegmentHeight]="hourSegmentHeight"
                [headerTemplate]="weekHeaderTemplate"
                [allDayEventsLabelTemplate]="allDayEventsLabelTemplate"
                [eventTitleTemplate]="calendarEventTitleTemplate"
                (eventClicked)="onEventClicked($event.event)"
                (hourSegmentClicked)="onSlotClicked($event.date)"
              />
            </div>
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
  readonly #dateFormatter = inject(CalendarDateFormatter);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly agendaScroll = viewChild<ElementRef<HTMLElement>>('agendaScroll');
  protected readonly icsFileInput = viewChild<ElementRef<HTMLInputElement>>('icsFileInput');

  readonly calendarView = CalendarView;
  readonly eventTypes = MANUAL_CALENDAR_EVENT_TYPES;
  readonly recurrenceFrequencies = CALENDAR_RECURRENCE_FREQUENCIES;
  readonly recurrenceNone = CalendarRecurrenceFrequency.NONE;
  readonly dayStartHour = 0;
  readonly dayStartMinute = 0;
  readonly dayEndHour = 23;
  readonly dayEndMinute = 59;
  readonly hourSegments = 4;
  readonly hourSegmentHeight = 36;
  readonly monthEventsPreviewLimit = 3;
  readonly weekStartsOn = AGENDA_WEEK_STARTS_ON;

  readonly view = signal<CalendarView>(CalendarView.Month);
  readonly viewDate = signal(new Date());
  readonly events = signal<ICalendarEvent[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly showForm = signal(false);
  readonly editing = signal<ICalendarEvent | null>(null);
  readonly previewEvent = signal<ICalendarEvent | null>(null);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly supportHint = signal<string | null>(null);
  readonly pendingDelete = signal<string | null>(null);
  readonly icsBusy = signal(false);
  readonly icsFeedback = signal<{ message: string; tone: 'success' | 'error' } | null>(null);
  readonly #formRangeVersion = signal(0);

  readonly canWrite = computed(() => this.#auth.hasPermission('secretariat:write'));
  readonly canViewSchedules = computed(() => this.#auth.hasPermission('schedules:read'));
  readonly isSystemBirthdayEvent = computed(() => Boolean(this.editing()?.sourceMemberId));
  readonly deleteTargetIsRecurring = computed(() =>
    Boolean(this.editing()?.isRecurring || this.previewEvent()?.isRecurring),
  );
  readonly locale = computed(() => this.#translate.currentLang() || 'en');

  readonly calendarEvents = computed<CalendarEvent<ICalendarEvent>[]>(() =>
    this.events().map((event) => {
      const palette = EVENT_COLORS[event.type];
      const displayEvent = {
        allDay: event.allDay,
        sourceMemberId: event.sourceMemberId,
        meta: event,
        start: event.startsAt,
      };
      return {
        id: event.id,
        title: event.title,
        start: new Date(event.startsAt),
        end: new Date(event.endsAt),
        allDay: isMonthBannerEventUtil(displayEvent),
        meta: event,
        color: calendarDisplayColor(palette, displayEvent),
      };
    }),
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
    this.#formRangeVersion();
    const v = this.form.getRawValue();
    return isEventRangeInvalid(v.startsAt, v.endsAt);
  });

  readonly crossMidnightHint = computed(() => {
    this.#formRangeVersion();
    const v = this.form.getRawValue();
    return isCrossMidnightSameDayEnd(v.startsAt, v.endsAt);
  });

  readonly spansMidnightHint = computed(() => {
    this.#formRangeVersion();
    const v = this.form.getRawValue();
    if (!v.startsAt || !v.endsAt) {
      return false;
    }
    const { startsAt, endsAt } = normalizeEventRange(v.startsAt, v.endsAt);
    return spansMidnight(startsAt, endsAt);
  });

  constructor() {
    effect(() => {
      const view = this.view();
      const date = this.viewDate();
      this.#load(view, date);
    });

    effect(() => {
      const view = this.view();
      const loading = this.loading();
      const date = this.viewDate();
      if (loading || (view !== CalendarView.Week && view !== CalendarView.Day)) {
        return;
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(() => this.#scrollTimeGrid(date));
      });
    });
  }

  ngOnInit(): void {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.#formRangeVersion.update((value) => value + 1);
    });
    this.#load(this.view(), this.viewDate());
  }

  reloadAgendaFromGoogleSync(): void {
    this.#load(this.view(), this.viewDate());
  }

  openCreate(date?: Date, options?: { preserveTime?: boolean }): void {
    if (!this.canWrite()) {
      return;
    }
    this.editing.set(null);
    const start = date ? new Date(date) : new Date();
    if (date && !options?.preserveTime) {
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

  openPreview(event: ICalendarEvent): void {
    this.previewEvent.set(event);
  }

  closePreview(): void {
    this.previewEvent.set(null);
  }

  editFromPreview(): void {
    const event = this.previewEvent();
    if (!event || !this.canWrite() || event.sourceMemberId) {
      return;
    }
    this.closePreview();
    this.openEdit(event);
  }

  deleteFromPreview(): void {
    const event = this.previewEvent();
    if (!event || !this.canWrite() || event.sourceMemberId) {
      return;
    }
    this.pendingDelete.set(event.seriesId || event.id);
  }

  printPreview(): void {
    const event = this.previewEvent();
    if (!event) {
      return;
    }
    const title = this.#escapeHtml(event.title);
    const when = this.#escapeHtml(this.previewWhenLabel(event));
    const type = this.#escapeHtml(this.#translate.instant(this.typeLabel(event.type)));
    const recurrence =
      event.recurrenceFrequency === CalendarRecurrenceFrequency.NONE
        ? ''
        : this.#escapeHtml(
            this.#translate.instant(this.recurrenceLabel(event.recurrenceFrequency)),
          );
    const location = event.location ? this.#escapeHtml(event.location) : '';
    const description = event.description ? this.#escapeHtml(event.description) : '';
    this.#printHtml(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;padding:24px;color:#111}h1{font-size:22px;margin:0 0 12px}p{margin:6px 0;color:#444}</style>
</head><body>
<h1>${title}</h1>
<p>${when}</p>
<p>${type}</p>
${recurrence ? `<p>${recurrence}</p>` : ''}
${location ? `<p>${location}</p>` : ''}
${description ? `<p>${description}</p>` : ''}
</body></html>`);
  }

  printCalendarView(): void {
    const view = this.view();
    const date = this.viewDate();
    const { from, to } = this.#rangeFor(view, date);
    const locale = this.locale();
    const periodLabel = this.#periodLabel(view, date);
    const viewLabel = this.#translate.instant(
      view === CalendarView.Month
        ? 'SECRETARIAT.VIEW_MONTH'
        : view === CalendarView.Week
          ? 'SECRETARIAT.VIEW_WEEK'
          : 'SECRETARIAT.VIEW_DAY',
    );
    const printableEvents = this.events().map((event) => ({
      title: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      allDay: event.allDay || Boolean(event.sourceMemberId),
      location: event.location,
      typeLabel: this.#translate.instant(this.typeLabel(event.type)),
    }));
    const groups = groupEventsForAgendaPrint(printableEvents, from, to, {
      includeEmptyDays: view === CalendarView.Week || view === CalendarView.Day,
    });
    const html = buildAgendaPrintHtml({
      title: this.#translate.instant('SECRETARIAT.AGENDA_TITLE'),
      periodLabel,
      viewLabel,
      emptyDayLabel: this.#translate.instant('SECRETARIAT.PRINT_EMPTY_DAY'),
      emptyPeriodLabel: this.#translate.instant('SECRETARIAT.PRINT_EMPTY_PERIOD'),
      allDayLabel: this.#translate.instant('SECRETARIAT.ALL_DAY'),
      groups,
      locale,
      escapeHtml: (value) => this.#escapeHtml(value),
    });
    this.#printHtml(html);
  }

  previewWhenLabel(event: ICalendarEvent): string {
    return formatEventPreviewWhen(
      event.startsAt,
      event.endsAt,
      event.allDay,
      this.locale(),
      this.#translate.instant('SECRETARIAT.ALL_DAY'),
    );
  }

  eventColor(type: CalendarEventType): {
    primary: string;
    secondary: string;
    secondaryText: string;
  } {
    return EVENT_COLORS[type];
  }

  onDayClicked(date: Date): void {
    if (this.canWrite()) {
      this.openCreate(date);
    }
  }

  openDayView(date: Date, sourceEvent: Event): void {
    sourceEvent.stopPropagation();
    this.viewDate.set(new Date(date));
    this.view.set(CalendarView.Day);
  }

  onSlotClicked(date: Date): void {
    if (this.canWrite()) {
      this.openCreate(date, { preserveTime: true });
    }
  }

  onEventClicked(event: CalendarEvent<ICalendarEvent>): void {
    if (event.meta && (this.canWrite() || this.canViewSchedules() || event.meta.sourceMemberId)) {
      this.openPreview(event.meta);
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
    const { startsAt, endsAt } = normalizeEventRange(v.startsAt, v.endsAt);
    const payload = {
      title: v.title,
      type: v.type,
      allDay: v.allDay,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
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
      this.previewEvent()?.seriesId ??
      this.events().find((event) => event.id === id || event.seriesId === id)?.seriesId ??
      id;
    this.#secretariat
      .removeCalendarEvent(seriesId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.pendingDelete.set(null);
          this.closePreview();
          this.closeForm();
          this.#load(this.view(), this.viewDate());
        },
        error: () => this.error.set(true),
      });
  }

  typeLabel(type: CalendarEventType): string {
    return `SECRETARIAT.EVENT_TYPE_${type.toUpperCase()}`;
  }

  formatEventTime(value: Date | string | number): string {
    const date = value instanceof Date ? value : new Date(value);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  formatEventTimeRange(start: Date | string | number, end: Date | string | number): string {
    return `${this.formatEventTime(start)} – ${this.formatEventTime(end)}`;
  }

  weekHeaderWeekday(date: Date): string {
    return formatWeekHeaderWeekday(date, this.locale());
  }

  weekHeaderDayNumber(date: Date): string {
    return formatWeekHeaderDayNumber(date);
  }

  monthEventsPreview(events: CalendarEvent<ICalendarEvent>[]): CalendarEvent<ICalendarEvent>[] {
    return previewMonthViewEvents(events, this.monthEventsPreviewLimit);
  }

  remainingMonthEventsCount(total: number): number {
    return remainingMonthViewEventsCount(total, this.monthEventsPreviewLimit);
  }

  isMonthBannerEvent(event: CalendarEvent<ICalendarEvent>): boolean {
    return isMonthBannerEventUtil(event);
  }

  monthTimedEventLabel(event: CalendarEvent<ICalendarEvent>): string {
    return `${this.formatEventTime(event.start)} ${event.title}`;
  }

  moreEventsAriaLabel(total: number): string {
    return this.#translate.instant('SECRETARIAT.MORE_EVENTS_DAY_VIEW', {
      count: this.remainingMonthEventsCount(total),
    });
  }

  eventLabel(event: CalendarEvent<ICalendarEvent>): string {
    if (event.allDay) {
      return event.title;
    }
    return `${this.formatEventTime(event.start)} ${event.title}`;
  }

  onMonthEventClicked(
    event: CalendarEvent<ICalendarEvent>,
    sourceEvent: Event,
    eventClicked: {
      emit: (value: {
        event: CalendarEvent<ICalendarEvent>;
        sourceEvent: MouseEvent | KeyboardEvent;
      }) => void;
    },
  ): void {
    sourceEvent.stopPropagation();
    eventClicked.emit({ event, sourceEvent: sourceEvent as MouseEvent });
  }

  recurrenceLabel(frequency: CalendarRecurrenceFrequency): string {
    return `SECRETARIAT.RECURRENCE_${frequency.toUpperCase()}`;
  }

  exportCurrentViewIcs(): void {
    const { from, to } = this.#rangeFor(this.view(), this.viewDate());
    this.icsBusy.set(true);
    this.icsFeedback.set(null);
    this.#secretariat
      .exportCalendarRangeIcs(from.toISOString(), to.toISOString())
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (blob) => {
          this.icsBusy.set(false);
          this.#downloadBlob(blob, `aic-agenda-${from.toISOString().slice(0, 10)}.ics`);
          this.icsFeedback.set({
            message: this.#translate.instant('SECRETARIAT.AGENDA.ICS.EXPORT_SUCCESS'),
            tone: 'success',
          });
        },
        error: () => {
          this.icsBusy.set(false);
          this.icsFeedback.set({
            message: this.#translate.instant('SECRETARIAT.AGENDA.ICS.EXPORT_ERROR'),
            tone: 'error',
          });
        },
      });
  }

  exportPreviewEventIcs(): void {
    const preview = this.previewEvent();
    if (!preview) {
      return;
    }
    const seriesId = preview.seriesId || preview.id;
    this.icsBusy.set(true);
    this.icsFeedback.set(null);
    this.#secretariat
      .exportCalendarEventIcs(seriesId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (blob) => {
          this.icsBusy.set(false);
          this.#downloadBlob(blob, `aic-event-${seriesId}.ics`);
          this.icsFeedback.set({
            message: this.#translate.instant('SECRETARIAT.AGENDA.ICS.EXPORT_SUCCESS'),
            tone: 'success',
          });
        },
        error: () => {
          this.icsBusy.set(false);
          this.icsFeedback.set({
            message: this.#translate.instant('SECRETARIAT.AGENDA.ICS.EXPORT_ERROR'),
            tone: 'error',
          });
        },
      });
  }

  triggerImportIcs(): void {
    if (!this.canWrite()) {
      this.icsFeedback.set({
        message: this.#translate.instant('SECRETARIAT.AGENDA.ICS.PERMISSION_DENIED'),
        tone: 'error',
      });
      return;
    }
    this.icsFileInput()?.nativeElement.click();
  }

  onIcsFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (!file.size) {
      this.icsFeedback.set({
        message: this.#translate.instant('SECRETARIAT.AGENDA.ICS.FILE_INVALID'),
        tone: 'error',
      });
      return;
    }
    this.icsBusy.set(true);
    this.icsFeedback.set(null);
    this.#secretariat
      .importCalendarIcs(file)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (result) => {
          this.icsBusy.set(false);
          this.icsFeedback.set({
            message: this.#importFeedbackMessage(result),
            tone: 'success',
          });
          if (result.created > 0) {
            this.#load(this.view(), this.viewDate());
          }
        },
        error: () => {
          this.icsBusy.set(false);
          this.icsFeedback.set({
            message: this.#translate.instant('SECRETARIAT.AGENDA.ICS.IMPORT_ERROR'),
            tone: 'error',
          });
        },
      });
  }

  #importFeedbackMessage(result: IImportCalendarEventsResponse): string {
    if (result.skipped.length > 0) {
      return this.#translate.instant('SECRETARIAT.AGENDA.ICS.IMPORT_PARTIAL', {
        created: result.created,
        skipped: result.skipped.length,
      });
    }
    return this.#translate.instant('SECRETARIAT.AGENDA.ICS.IMPORT_SUCCESS', {
      count: result.created,
    });
  }

  #downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
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
        return {
          from: startOfWeek(date, { weekStartsOn: AGENDA_WEEK_STARTS_ON }),
          to: endOfWeek(date, { weekStartsOn: AGENDA_WEEK_STARTS_ON }),
        };
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

  #escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  #periodLabel(view: CalendarView, date: Date): string {
    const locale = this.locale();
    if (view === CalendarView.Week) {
      return this.#dateFormatter.weekViewTitle({
        date,
        locale,
        weekStartsOn: this.weekStartsOn,
      });
    }
    if (view === CalendarView.Day) {
      return this.#dateFormatter.dayViewTitle({ date, locale });
    }
    return this.#dateFormatter.monthViewTitle({ date, locale });
  }

  #printHtml(html: string): void {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText =
      'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(iframe);
    const frameWindow = iframe.contentWindow;
    const frameDocument = iframe.contentDocument ?? frameWindow?.document;
    if (!frameWindow || !frameDocument) {
      iframe.remove();
      return;
    }
    frameDocument.open();
    frameDocument.write(html);
    frameDocument.close();
    const cleanup = () => iframe.remove();
    frameWindow.addEventListener('afterprint', cleanup, { once: true });
    frameWindow.focus();
    frameWindow.print();
    window.setTimeout(cleanup, 2000);
  }

  #scrollTimeGrid(viewDate: Date): void {
    const container = this.agendaScroll()?.nativeElement;
    if (!container) {
      return;
    }

    const startMinutes = this.dayStartHour * 60 + this.dayStartMinute;
    const segmentMinutes = 60 / this.hourSegments;
    let targetMinutes: number;

    if (isSameDay(viewDate, new Date())) {
      const now = new Date();
      targetMinutes = now.getHours() * 60 + now.getMinutes() - 60;
    } else {
      targetMinutes = 8 * 60;
    }

    targetMinutes = Math.max(startMinutes, targetMinutes);
    const segmentIndex = Math.floor((targetMinutes - startMinutes) / segmentMinutes);
    const scrollTop = segmentIndex * this.hourSegmentHeight;
    const offset = container.clientHeight * 0.15;

    container.scrollTop = Math.max(0, scrollTop - offset);
  }
}
