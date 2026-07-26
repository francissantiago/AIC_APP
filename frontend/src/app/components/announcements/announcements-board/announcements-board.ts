import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { AnnouncementStatus } from '@enums/announcement-status';
import { IAnnouncement } from '@interfaces/IAnnouncement';
import { AnnouncementsService } from '@services/announcements-service';
import { DateDisplayService } from '@services/date-display-service';
import { AppDateTimePipe } from '@pipes/app-date-time-pipe';

@Component({
  selector: 'app-announcements-board',
  imports: [AppDateTimePipe, TranslatePipe],
  templateUrl: './announcements-board.html',
  styleUrl: './announcements-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnouncementsBoard implements OnInit {
  readonly #announcementsService = inject(AnnouncementsService);
  readonly #dates = inject(DateDisplayService);
  readonly #destroyRef = inject(DestroyRef);

  readonly announcements = signal<IAnnouncement[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(false);

    this.#announcementsService
      .listBoard({ limit: 50 })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.announcements.set(response.data);
          this.loading.set(false);
        },
        error: () => {
          this.announcements.set([]);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }

  statusLabelKey(status: AnnouncementStatus): string {
    return `ANNOUNCEMENTS.STATUS_${status.toUpperCase()}`;
  }

  formatBody(body: string): string {
    return this.#dates.formatIsoDatesInText(body);
  }
}
