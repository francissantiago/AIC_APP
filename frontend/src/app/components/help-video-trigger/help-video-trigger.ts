import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { HelpVideoDialog } from '@components/help-video-dialog/help-video-dialog';
import type { IHelpVideo } from '@interfaces/IHelpVideo';
import { HelpVideoService } from '@services/help-video-service';

@Component({
  selector: 'app-help-video-trigger',
  imports: [HelpVideoDialog, TranslatePipe],
  templateUrl: './help-video-trigger.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpVideoTrigger {
  readonly #helpVideos = inject(HelpVideoService);

  readonly featureId = input<string | null>(null);
  readonly video = input<IHelpVideo | null>(null);

  readonly dialogOpen = signal(false);

  readonly resolvedVideo = computed(() => {
    const direct = this.video();
    if (direct) {
      return direct;
    }

    const id = this.featureId();
    if (!id) {
      return null;
    }

    return this.#helpVideos.getByFeatureId(id);
  });

  openDialog(): void {
    if (!this.resolvedVideo()) {
      return;
    }
    this.dialogOpen.set(true);
  }
}
