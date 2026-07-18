import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, Injector } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ApiErrorDetail, ApiErrorResponse, ResolvedApiError } from '@interfaces/api-error';

function isApiErrorDetail(value: unknown): value is ApiErrorDetail {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const detail = value as Record<string, unknown>;
  return typeof detail['code'] === 'string' && typeof detail['message'] === 'string';
}

@Injectable({
  providedIn: 'root',
})
export class ApiErrorService {
  /** Lazy: evita ciclo AuthService → ApiErrorService → TranslateService → HttpClient → interceptor. */
  readonly #injector = inject(Injector);
  #translate: TranslateService | null = null;

  resolve(error: unknown): ResolvedApiError {
    if (error instanceof HttpErrorResponse) {
      return this.#resolveHttpError(error);
    }

    return {
      statusCode: 0,
      displayMessage: this.#instant('ERRORS.GENERIC'),
      i18nKey: 'ERRORS.GENERIC',
      details: [],
    };
  }

  #resolveHttpError(error: HttpErrorResponse): ResolvedApiError {
    if (error.status === 0) {
      return {
        statusCode: 0,
        displayMessage: this.#instant('ERRORS.NETWORK'),
        i18nKey: 'ERRORS.NETWORK',
        details: [],
      };
    }

    const envelope = this.#parseEnvelope(error.error);
    const code = envelope?.code;
    const details = envelope?.details ?? [];
    const traceId = envelope?.traceId;
    const backendMessage = envelope?.message?.trim() || '';

    const fromCode = code ? this.#translateByCode(code) : null;
    const statusFallback = this.#fallbackByStatus(error.status, details);
    const displayMessage = fromCode?.message ?? (backendMessage || statusFallback.message);

    const resolved: ResolvedApiError = {
      statusCode: error.status,
      code,
      traceId,
      displayMessage,
      i18nKey: fromCode?.key ?? statusFallback.key,
      details,
    };

    if (error.status >= 500) {
      resolved.supportHint = this.#supportHint(code ?? 'SYS.INTERNAL', traceId);
    } else if (error.status === 401 && traceId) {
      resolved.supportHint = this.#supportHint(code, traceId);
    }

    return resolved;
  }

  #parseEnvelope(value: unknown): ApiErrorResponse | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const body = value as Record<string, unknown>;
    const statusCode = typeof body['statusCode'] === 'number' ? body['statusCode'] : undefined;
    const errorLabel = typeof body['error'] === 'string' ? body['error'] : '';
    const code = typeof body['code'] === 'string' ? body['code'] : '';
    const message = typeof body['message'] === 'string' ? body['message'] : '';

    if (!code && !message && !Array.isArray(body['message'])) {
      return null;
    }

    const details = Array.isArray(body['details']) ? body['details'].filter(isApiErrorDetail) : [];

    return {
      statusCode: statusCode ?? 0,
      error: errorLabel,
      code,
      message: message || (Array.isArray(body['message']) ? String(body['message'][0] ?? '') : ''),
      details,
      traceId: typeof body['traceId'] === 'string' ? body['traceId'] : undefined,
    };
  }

  #getTranslate(): TranslateService {
    this.#translate ??= this.#injector.get(TranslateService);
    return this.#translate;
  }

  #translateByCode(code: string): { key: string; message: string } | null {
    const key = `ERRORS.${code}`;
    const translated = this.#getTranslate().instant(key);
    if (typeof translated !== 'string' || translated === key) {
      return null;
    }
    return { key, message: translated };
  }

  #fallbackByStatus(status: number, details: ApiErrorDetail[]): { key: string; message: string } {
    if (status === 401) {
      return {
        key: 'ERRORS.AUTH.INVALID_CREDENTIALS',
        message: this.#instant('ERRORS.AUTH.INVALID_CREDENTIALS'),
      };
    }
    if (status === 403) {
      return {
        key: 'ERRORS.AUTH.FORBIDDEN',
        message: this.#instant('ERRORS.AUTH.FORBIDDEN'),
      };
    }
    if (status === 404) {
      return {
        key: 'ERRORS.SYS.NOT_FOUND',
        message: this.#instant('ERRORS.SYS.NOT_FOUND'),
      };
    }
    if (status === 409) {
      return {
        key: 'ERRORS.GENERIC',
        message: this.#instant('ERRORS.GENERIC'),
      };
    }
    if (status === 400 || status === 422) {
      const firstDetail = details[0]?.message?.trim();
      if (firstDetail) {
        return { key: 'ERRORS.SYS.VALIDATION', message: firstDetail };
      }
      return {
        key: 'ERRORS.SYS.VALIDATION',
        message: this.#instant('ERRORS.SYS.VALIDATION'),
      };
    }
    if (status >= 500) {
      return {
        key: 'ERRORS.SYS.INTERNAL',
        message: this.#instant('ERRORS.SYS.INTERNAL'),
      };
    }
    return {
      key: 'ERRORS.SAVE_FAILED',
      message: this.#instant('ERRORS.SAVE_FAILED'),
    };
  }

  #supportHint(code?: string, traceId?: string): string | undefined {
    if (!code && !traceId) {
      return undefined;
    }
    return this.#getTranslate().instant('ERRORS.SUPPORT_HINT', {
      code: code ?? '—',
      traceId: traceId ?? '—',
    });
  }

  #instant(key: string): string {
    const value = this.#getTranslate().instant(key);
    return typeof value === 'string' ? value : key;
  }
}
