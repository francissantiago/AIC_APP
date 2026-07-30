import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { I18nService } from '@services/i18n-service';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import {
  getWeekStartsOn,
  isIsoDateInRange,
  parseIsoDateOnly,
  toIsoDateOnly,
} from '@utils/date-display.util';

const WEEKDAY_KEYS = [
  'DATE_INPUT.WEEKDAY_SUN',
  'DATE_INPUT.WEEKDAY_MON',
  'DATE_INPUT.WEEKDAY_TUE',
  'DATE_INPUT.WEEKDAY_WED',
  'DATE_INPUT.WEEKDAY_THU',
  'DATE_INPUT.WEEKDAY_FRI',
  'DATE_INPUT.WEEKDAY_SAT',
] as const;

@Component({
  selector: 'app-date-picker-calendar',
  imports: [TranslatePipe],
  templateUrl: './date-picker-calendar.html',
  styleUrl: './date-picker-calendar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatePickerCalendar {
  readonly #i18n = inject(I18nService);

  readonly selectedIso = input<string | null>(null);
  readonly min = input<string | null>(null);
  readonly max = input<string | null>(null);
  readonly daySelected = output<string>();

  readonly viewMonth = signal(new Date());

  readonly monthLabel = computed(() => {
    this.#i18n.currentLang();
    return new Intl.DateTimeFormat(this.#i18n.currentLang(), {
      month: 'long',
      year: 'numeric',
    }).format(this.viewMonth());
  });

  readonly weekdayKeys = computed(() => {
    const weekStartsOn = getWeekStartsOn(this.#i18n.currentLang());
    const ordered = [...WEEKDAY_KEYS.slice(weekStartsOn), ...WEEKDAY_KEYS.slice(0, weekStartsOn)];
    return ordered;
  });

  readonly weeks = computed(() => {
    const monthStart = startOfMonth(this.viewMonth());
    const monthEnd = endOfMonth(this.viewMonth());
    const weekStartsOn = getWeekStartsOn(this.#i18n.currentLang());
    const gridStart = startOfWeek(monthStart, { weekStartsOn });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn });
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

    const rows: Date[][] = [];
    for (let index = 0; index < days.length; index += 7) {
      rows.push(days.slice(index, index + 7));
    }
    return rows;
  });

  readonly todayIso = toIsoDateOnly(new Date());

  previousMonth(): void {
    this.viewMonth.update((current) => subMonths(current, 1));
  }

  nextMonth(): void {
    this.viewMonth.update((current) => addMonths(current, 1));
  }

  selectToday(): void {
    const today = this.todayIso;
    if (!this.isDayDisabled(today)) {
      this.daySelected.emit(today);
    }
  }

  selectDay(day: Date): void {
    const iso = toIsoDateOnly(day);
    if (this.isDayDisabled(iso)) {
      return;
    }
    this.daySelected.emit(iso);
  }

  isDayDisabled(iso: string): boolean {
    return !isIsoDateInRange(iso, this.min(), this.max());
  }

  isSelectedDay(day: Date): boolean {
    const selected = this.selectedIso();
    if (!selected) {
      return false;
    }
    const selectedDate = parseIsoDateOnly(selected);
    return selectedDate ? isSameDay(day, selectedDate) : false;
  }

  isToday(day: Date): boolean {
    return isSameDay(day, new Date());
  }

  isCurrentMonth(day: Date): boolean {
    return isSameMonth(day, this.viewMonth());
  }

  dayIso(day: Date): string {
    return toIsoDateOnly(day);
  }

  onDayKeydown(event: KeyboardEvent, day: Date): void {
    const iso = this.dayIso(day);
    if (this.isDayDisabled(iso)) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectDay(day);
      return;
    }

    let offset = 0;
    if (event.key === 'ArrowLeft') {
      offset = -1;
    } else if (event.key === 'ArrowRight') {
      offset = 1;
    } else if (event.key === 'ArrowUp') {
      offset = -7;
    } else if (event.key === 'ArrowDown') {
      offset = 7;
    }

    if (offset !== 0) {
      event.preventDefault();
      const nextDay = addDays(day, offset);
      const nextIso = this.dayIso(nextDay);
      if (!this.isDayDisabled(nextIso)) {
        this.selectDay(nextDay);
      }
    }
  }

  syncViewToSelected(): void {
    const selected = this.selectedIso();
    if (!selected) {
      return;
    }
    const parsed = parseIsoDateOnly(selected);
    if (parsed) {
      this.viewMonth.set(parsed);
    }
  }
}
