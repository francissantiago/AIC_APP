import { DatePipe } from '@angular/common';
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
import { ActivatedRoute, Router } from '@angular/router';
import { ScheduleEventEditor } from '@components/secretariat/schedule-event-editor/schedule-event-editor';
import { MinistryStatus } from '@enums/ministry-status';
import { IMinistry } from '@interfaces/IMinistry';
import { IScheduleWeekViewEvent } from '@interfaces/IScheduleWeekView';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '@services/auth-service';
import { MinistriesService } from '@services/ministries-service';
import { SchedulesService } from '@services/schedules-service';
import { addDays, endOfWeek, format, startOfWeek } from 'date-fns';

@Component({
  selector: 'app-schedules-board',
  imports: [DatePipe, ReactiveFormsModule, ScheduleEventEditor, TranslatePipe],
  templateUrl: './schedules-board.html',
  styleUrl: './schedules-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulesBoard implements OnInit {
  readonly #schedules = inject(SchedulesService);
  readonly #ministries = inject(MinistriesService);
  readonly #auth = inject(AuthService);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);

  readonly weekAnchor = signal(startOfWeek(new Date(), { weekStartsOn: 0 }));
  readonly ministries = signal<IMinistry[]>([]);
  readonly events = signal<IScheduleWeekViewEvent[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly feedback = signal<string | null>(null);
  readonly editorOpen = signal(false);
  readonly editorEventId = signal<string | null>(null);
  readonly editorMinistryId = signal<string | null>(null);

  readonly canWrite = computed(() => this.#auth.hasPermission('schedules:write'));

  readonly weekFrom = computed(() => this.weekAnchor());
  readonly weekTo = computed(() => endOfWeek(this.weekAnchor(), { weekStartsOn: 0 }));
  readonly weekLabel = computed(
    () => `${format(this.weekFrom(), 'yyyy-MM-dd')} – ${format(this.weekTo(), 'yyyy-MM-dd')}`,
  );

  readonly filterForm = new FormGroup({
    ministryId: new FormControl('', { nonNullable: true }),
    unconfirmedOnly: new FormControl(false, { nonNullable: true }),
  });

  ngOnInit(): void {
    this.#loadMinistries();
    this.#loadWeek();

    this.filterForm.valueChanges
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#loadWeek());

    this.#route.queryParamMap.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
      const eventId = params.get('eventId');
      if (eventId) {
        this.openEditor(eventId);
      }
    });
  }

  previousWeek(): void {
    this.weekAnchor.update((value) => addDays(value, -7));
    this.#loadWeek();
  }

  nextWeek(): void {
    this.weekAnchor.update((value) => addDays(value, 7));
    this.#loadWeek();
  }

  goCurrentWeek(): void {
    this.weekAnchor.set(startOfWeek(new Date(), { weekStartsOn: 0 }));
    this.#loadWeek();
  }

  openEditor(eventId?: string, ministryId?: string): void {
    this.feedback.set(null);
    this.editorEventId.set(eventId ?? null);
    this.editorMinistryId.set(ministryId ?? null);
    this.editorOpen.set(true);
  }

  closeEditor(): void {
    this.editorOpen.set(false);
    this.editorEventId.set(null);
    this.editorMinistryId.set(null);
    if (this.#route.snapshot.queryParamMap.get('eventId')) {
      void this.#router.navigate([], {
        relativeTo: this.#route,
        queryParams: { eventId: null },
        queryParamsHandling: 'merge',
      });
    }
  }

  afterSave(): void {
    this.feedback.set('SCHEDULES.SAVE_SUCCESS');
    this.#loadWeek();
  }

  #loadMinistries(): void {
    this.#ministries
      .list({ page: 1, limit: 100, status: MinistryStatus.ACTIVE })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (result) => this.ministries.set(result.data),
        error: () => this.ministries.set([]),
      });
  }

  #loadWeek(): void {
    const filters = this.filterForm.getRawValue();
    this.loading.set(true);
    this.error.set(false);

    this.#schedules
      .getWeekView({
        from: this.weekFrom().toISOString(),
        to: this.weekTo().toISOString(),
        ministryId: filters.ministryId || undefined,
        unconfirmedOnly: filters.unconfirmedOnly || undefined,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (result) => {
          this.events.set(result.events);
          this.loading.set(false);
        },
        error: () => {
          this.events.set([]);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }
}
