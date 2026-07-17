import { of } from 'rxjs';

/** Minimal TranslateService stub for component unit tests (avoids NG0203 with provideTranslateService). */
export function translateServiceStub() {
  return {
    instant: (key: string) => key,
    get: (key: string) => of(key),
    stream: (key: string) => of(key),
    onLangChange: of({ lang: 'en', translations: {} }),
    onTranslationChange: of({ translations: {} }),
    onDefaultLangChange: of({ lang: 'en', translations: {} }),
    currentLang: 'en',
    defaultLang: 'en',
    langs: ['en'],
    use: () => of('en'),
    setDefaultLang: () => undefined,
    addLangs: () => undefined,
    getLangs: () => ['en'],
    getBrowserLang: () => 'en',
    getBrowserCultureLang: () => 'en-US',
  };
}
