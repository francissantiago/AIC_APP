import { Injectable } from '@angular/core';
import { applyRuntimeConfig } from 'environments/environment';
import { IAppRuntimeConfig } from '@interfaces/IAppRuntimeConfig';

const CONFIG_URL = '/assets/app-config.json';

@Injectable({
  providedIn: 'root',
})
export class AppConfigService {
  async load(): Promise<void> {
    try {
      const response = await fetch(`${CONFIG_URL}?_=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        return;
      }

      const config = (await response.json()) as Partial<IAppRuntimeConfig>;
      applyRuntimeConfig(config);
    } catch {
      // Mantém defaults de environment.ts quando o JSON não está disponível.
    }
  }
}
