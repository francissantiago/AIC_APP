import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-action-button-group',
  imports: [TranslatePipe],
  templateUrl: './action-button-group.html',
  styleUrl: './action-button-group.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionButtonGroup {
  readonly ariaLabelKey = input('COMMON.ACTIONS');
}
