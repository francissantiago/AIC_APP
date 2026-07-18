import { registerLocaleData } from '@angular/common';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import localeEs from '@angular/common/locales/es';
import localePt from '@angular/common/locales/pt';
import { DEFAULT_APP_LANGUAGE } from '@enums/app-language';
import { authInterceptor } from '@interceptors/auth-interceptor';
import { AuthService } from '@services/auth-service';
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
    provideAppInitializer(() => {
      inject(I18nService).init();
      return inject(AuthService).restoreSession();
    }),
  ],
};
