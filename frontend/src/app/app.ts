import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaInstallBanner } from '@components/pwa/pwa-install-banner/pwa-install-banner';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PwaInstallBanner],
  template: `
    <app-pwa-install-banner />
    <router-outlet />
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
