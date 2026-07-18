export interface ApiErrorDetail {
  field?: string;
  code: string;
  message: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  code: string;
  message: string;
  details?: ApiErrorDetail[];
  traceId?: string;
}

export interface ResolvedApiError {
  statusCode: number;
  code?: string;
  traceId?: string;
  /** Texto já pronto para exibir (traduzido ou fallback) */
  displayMessage: string;
  /** Chave i18n usada, se houver */
  i18nKey?: string;
  details: ApiErrorDetail[];
  /** Para 5xx/auth: hint com code+traceId */
  supportHint?: string;
}
