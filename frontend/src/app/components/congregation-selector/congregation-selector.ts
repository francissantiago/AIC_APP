import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CongregationType } from '@enums/congregation-type';
import { CongregationContextService } from '@services/congregation-context-service';

@Component({
  selector: 'app-congregation-selector',
  imports: [TranslatePipe],
  templateUrl: './congregation-selector.html',
  styleUrl: './congregation-selector.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CongregationSelector {
  readonly #context = inject(CongregationContextService);

  readonly switchedFeedback = signal(false);

  readonly selectorVisible = this.#context.selectorVisible;
  readonly loading = this.#context.loading;
  readonly error = this.#context.error;
  readonly memberships = this.#context.memberships;
  readonly activeCongregationId = this.#context.activeCongregationId;
  readonly contextDeniedMessage = this.#context.contextDeniedMessage;

  typeLabelKey(type: CongregationType): string {
    return type === CongregationType.HEADQUARTERS
      ? 'CONGREGATION.TYPE_HEADQUARTERS'
      : 'CONGREGATION.TYPE_BRANCH';
  }

  onCongregationChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const congregationId = select.value;
    if (!congregationId || congregationId === this.activeCongregationId()) {
      return;
    }

    this.#context.switchActiveCongregation(congregationId);
    this.switchedFeedback.set(true);
    this.#context.clearContextDeniedMessage();
  }
}
