import { registerLocaleData } from '@angular/common';
import {
  ApplicationConfig,
  inject,
  isDevMode,
  LOCALE_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import localeEs from '@angular/common/locales/es';
import localePt from '@angular/common/locales/pt';
import { DEFAULT_APP_LANGUAGE } from '@enums/app-language';
import { authInterceptor } from '@interceptors/auth-interceptor';
import { AppConfigService } from '@services/app-config-service';
import { AuthService } from '@services/auth-service';
import { CongregationContextService } from '@services/congregation-context-service';
import { I18nService } from '@services/i18n-service';
import { routes } from './app.routes';

registerLocaleData(localePt, 'pt-BR');
registerLocaleData(localeEs, 'es');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: '/i18n/',
        suffix: '.json',
      }),
      fallbackLang: DEFAULT_APP_LANGUAGE,
      lang: DEFAULT_APP_LANGUAGE,
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideAppInitializer(async () => {
      const appConfig = inject(AppConfigService);
      const i18n = inject(I18nService);
      const auth = inject(AuthService);
      const congregationContext = inject(CongregationContextService);

      await appConfig.load();
      i18n.init();
      await auth.restoreSession();
      if (auth.isAuthenticated()) {
        await congregationContext.initialize();
      }
    }),
    {
      provide: LOCALE_ID,
      useFactory: () => inject(I18nService).currentLang(),
    },
  ],
};
