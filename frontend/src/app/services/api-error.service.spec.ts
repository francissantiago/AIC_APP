import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { ApiErrorService } from './api-error.service';

describe('ApiErrorService', () => {
  let service: ApiErrorService;
  const translations: Record<string, string> = {
    'ERRORS.MEMBERS.EMAIL_IN_USE': 'This email is already registered.',
    'ERRORS.SYS.INTERNAL': 'An internal error occurred.',
    'ERRORS.SYS.VALIDATION': 'Invalid data.',
    'ERRORS.SYS.NOT_FOUND': 'Resource not found.',
    'ERRORS.AUTH.INVALID_CREDENTIALS': 'Invalid credentials.',
    'ERRORS.AUTH.FORBIDDEN': 'Forbidden.',
    'ERRORS.GENERIC': 'Something went wrong.',
    'ERRORS.SAVE_FAILED': 'Could not save.',
    'ERRORS.NETWORK': 'Network error.',
    'ERRORS.SUPPORT_HINT': 'Support code: {{code}} · Ref: {{traceId}}',
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ApiErrorService,
        {
          provide: TranslateService,
          useValue: {
            instant: (key: string, params?: Record<string, string>) => {
              const template = translations[key] ?? key;
              if (!params) {
                return template;
              }
              return template
                .replace('{{code}}', params['code'] ?? '')
                .replace('{{traceId}}', params['traceId'] ?? '');
            },
          },
        },
      ],
    });
    service = TestBed.inject(ApiErrorService);
  });

  it('should resolve code via i18n', () => {
    const resolved = service.resolve(
      new HttpErrorResponse({
        status: 409,
        error: {
          statusCode: 409,
          error: 'Conflict',
          code: 'MEMBERS.EMAIL_IN_USE',
          message: 'Este e-mail já está cadastrado.',
        },
      }),
    );

    expect(resolved.displayMessage).toBe('This email is already registered.');
    expect(resolved.i18nKey).toBe('ERRORS.MEMBERS.EMAIL_IN_USE');
    expect(resolved.code).toBe('MEMBERS.EMAIL_IN_USE');
  });

  it('should fallback to backend message when i18n key is missing', () => {
    const resolved = service.resolve(
      new HttpErrorResponse({
        status: 409,
        error: {
          statusCode: 409,
          error: 'Conflict',
          code: 'UNKNOWN.CODE',
          message: 'Mensagem do backend',
        },
      }),
    );

    expect(resolved.displayMessage).toBe('Mensagem do backend');
  });

  it('should include supportHint for 500', () => {
    const resolved = service.resolve(
      new HttpErrorResponse({
        status: 500,
        error: {
          statusCode: 500,
          error: 'Internal Server Error',
          code: 'SYS.INTERNAL',
          message: 'Ocorreu um erro interno.',
          traceId: 'AIC-E7F3A2B1',
        },
      }),
    );

    expect(resolved.displayMessage).toBe('An internal error occurred.');
    expect(resolved.supportHint).toBe('Support code: SYS.INTERNAL · Ref: AIC-E7F3A2B1');
  });

  it('should fallback to backend message for legacy Nest payload without code', () => {
    const resolved = service.resolve(
      new HttpErrorResponse({
        status: 404,
        error: {
          statusCode: 404,
          error: 'Not Found',
          message: 'Membro x não encontrado',
        },
      }),
    );

    expect(resolved.displayMessage).toBe('Membro x não encontrado');
  });

  it('should fallback by status when legacy payload has no message', () => {
    const resolved = service.resolve(
      new HttpErrorResponse({
        status: 404,
        error: {
          statusCode: 404,
          error: 'Not Found',
        },
      }),
    );

    expect(resolved.displayMessage).toBe('Resource not found.');
    expect(resolved.i18nKey).toBe('ERRORS.SYS.NOT_FOUND');
  });

  it('should map network errors', () => {
    const resolved = service.resolve(
      new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' }),
    );

    expect(resolved.displayMessage).toBe('Network error.');
    expect(resolved.i18nKey).toBe('ERRORS.NETWORK');
  });
});
