import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  APP_LANGUAGE_STORAGE_KEY,
  APP_LANGUAGES,
  AppLanguage,
  DEFAULT_APP_LANGUAGE,
  isAppLanguage,
} from '@enums/app-language';

export interface AppLanguageOption {
  code: AppLanguage;
  labelKey: string;
}

@Injectable({
  providedIn: 'root',
})
export class I18nService {
  readonly #translate = inject(TranslateService);
  readonly #document = inject(DOCUMENT);

  readonly languages: readonly AppLanguageOption[] = [
    { code: AppLanguage.English, labelKey: 'LANGUAGES.EN' },
    { code: AppLanguage.Spanish, labelKey: 'LANGUAGES.ES' },
    { code: AppLanguage.PortugueseBrazil, labelKey: 'LANGUAGES.PT_BR' },
  ];

  readonly currentLang = signal<AppLanguage>(DEFAULT_APP_LANGUAGE);

  init(): void {
    this.#translate.addLangs([...APP_LANGUAGES]);
    this.#translate.setFallbackLang(DEFAULT_APP_LANGUAGE);

    const language = this.#resolveInitialLanguage();
    this.setLanguage(language);
  }

  setLanguage(language: AppLanguage): void {
    this.#translate.use(language);
    this.currentLang.set(language);
    this.#document.documentElement.lang = language;
    localStorage.setItem(APP_LANGUAGE_STORAGE_KEY, language);
  }

  #resolveInitialLanguage(): AppLanguage {
    const stored = localStorage.getItem(APP_LANGUAGE_STORAGE_KEY);
    if (isAppLanguage(stored)) {
      return stored;
    }

    const browserLang = this.#translate.getBrowserLang();
    if (browserLang === 'pt') {
      return AppLanguage.PortugueseBrazil;
    }

    if (browserLang === 'es') {
      return AppLanguage.Spanish;
    }

    if (browserLang === 'en') {
      return AppLanguage.English;
    }

    return DEFAULT_APP_LANGUAGE;
  }
}
