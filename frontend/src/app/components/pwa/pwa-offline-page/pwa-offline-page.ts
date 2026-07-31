import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-pwa-offline-page',
  imports: [TranslatePipe],
  templateUrl: './pwa-offline-page.html',
  styleUrl: './pwa-offline-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PwaOfflinePage {
  retry(): void {
    window.location.reload();
  }
}
