import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PwaInstallService } from '@services/pwa-install-service';

@Component({
  selector: 'app-pwa-install-banner',
  imports: [TranslatePipe],
  templateUrl: './pwa-install-banner.html',
  styleUrl: './pwa-install-banner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PwaInstallBanner {
  readonly #pwaInstallService = inject(PwaInstallService);

  readonly visible = computed(
    () => this.#pwaInstallService.canInstall() && !this.#pwaInstallService.dismissed(),
  );

  install(): void {
    void this.#pwaInstallService.promptInstall();
  }

  dismiss(): void {
    this.#pwaInstallService.dismiss();
  }
}
