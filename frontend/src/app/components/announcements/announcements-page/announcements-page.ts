import { ChangeDetectionStrategy, Component, computed, inject, viewChild } from '@angular/core';
import { AnnouncementsBoard } from '@components/announcements/announcements-board/announcements-board';
import { AnnouncementsList } from '@components/announcements/announcements-list/announcements-list';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '@services/auth-service';

@Component({
  selector: 'app-announcements-page',
  imports: [AnnouncementsBoard, AnnouncementsList, TranslatePipe],
  templateUrl: './announcements-page.html',
  styleUrl: './announcements-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnouncementsPage {
  readonly #auth = inject(AuthService);
  readonly board = viewChild(AnnouncementsBoard);

  readonly canWrite = computed(() => this.#auth.hasPermission('announcements:write'));

  onManagementChanged(): void {
    this.board()?.reload();
  }
}
