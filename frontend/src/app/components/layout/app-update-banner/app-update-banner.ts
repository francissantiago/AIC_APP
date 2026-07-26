import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AppVersionService } from '@services/app-version-service';

@Component({
  selector: 'app-app-update-banner',
  imports: [TranslatePipe],
  templateUrl: './app-update-banner.html',
  styleUrl: './app-update-banner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppUpdateBanner {
  readonly #appVersionService = inject(AppVersionService);

  readonly updateAvailable = this.#appVersionService.updateAvailable;
  readonly dismissed = signal(false);

  readonly visible = computed(() => this.updateAvailable() && !this.dismissed());

  reloadNow(): void {
    this.#appVersionService.reloadApplication();
  }

  dismiss(): void {
    this.dismissed.set(true);
  }
}
