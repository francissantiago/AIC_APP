import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-no-access',
  imports: [TranslatePipe],
  template: `
    <section class="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 class="text-xl font-semibold text-slate-900">
        {{ 'AUTH.NO_ACCESSIBLE_ROUTES' | translate }}
      </h1>
      <p class="mt-2 text-sm text-slate-600">{{ 'AUTH.NO_ACCESSIBLE_ROUTES_HINT' | translate }}</p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoAccess {}
