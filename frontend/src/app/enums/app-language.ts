export enum AppLanguage {
  English = 'en',
  Spanish = 'es',
  PortugueseBrazil = 'pt-BR',
}

export const APP_LANGUAGES = [
  AppLanguage.English,
  AppLanguage.Spanish,
  AppLanguage.PortugueseBrazil,
] as const;

export const DEFAULT_APP_LANGUAGE = AppLanguage.English;

export const APP_LANGUAGE_STORAGE_KEY = 'aic.lang';

export function isAppLanguage(value: string | null | undefined): value is AppLanguage {
  return (
    value === AppLanguage.English ||
    value === AppLanguage.Spanish ||
    value === AppLanguage.PortugueseBrazil
  );
}
