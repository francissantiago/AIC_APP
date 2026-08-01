import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ActionButtonVariant } from '@enums/action-button-variant';
import { ACTION_BUTTON_CONFIG } from '@components/action-button/action-button.config';

@Component({
  selector: 'app-action-button',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './action-button.html',
  styleUrl: './action-button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionButton {
  readonly variant = input.required<ActionButtonVariant>();
  readonly labelKey = input.required<string>();
  readonly appearance = input<'icon-only' | 'icon-label'>('icon-only');
  readonly size = input<'sm' | 'md'>('sm');
  readonly disabled = input(false);
  readonly testId = input<string | undefined>(undefined);
  readonly ariaExpanded = input<boolean | null>(null);
  readonly routerLink = input<string | readonly string[] | undefined>(undefined);
  readonly queryParams = input<Record<string, string> | undefined>(undefined);

  readonly action = output<void>();

  readonly config = computed(() => ACTION_BUTTON_CONFIG[this.variant()]);
  readonly isRouterLink = computed(() => this.routerLink() !== undefined);

  readonly buttonClasses = computed(() => {
    const appearance = this.appearance();
    const size = this.size();
    const tone = this.config().toneClasses;
    const base =
      'action-button inline-flex items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50';

    if (appearance === 'icon-label') {
      const sizeClasses =
        size === 'sm' ? 'gap-1.5 px-2.5 py-1.5 text-xs' : 'gap-2 px-3 py-2 text-sm';
      return `${base} ${tone} ${sizeClasses}`;
    }

    const sizeClasses = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';
    return `${base} ${tone} ${sizeClasses}`;
  });

  readonly iconSizeClasses = computed(() =>
    this.size() === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]',
  );

  onClick(): void {
    if (this.disabled()) {
      return;
    }

    this.action.emit();
  }
}
