import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Response } from 'express';
import {
  ApiErrorCode,
  ApiErrorDetail,
  ApiErrorMessage,
  ApiErrorResponse,
} from '../errors/api-error.types';

const HTTP_ERROR_LABELS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Bad Request',
  [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
  [HttpStatus.FORBIDDEN]: 'Forbidden',
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.CONFLICT]: 'Conflict',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
};

function isApiErrorDetail(value: unknown): value is ApiErrorDetail {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const detail = value as Record<string, unknown>;
  return typeof detail.code === 'string' && typeof detail.message === 'string';
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const envelope = this.normalizeHttpException(exception);
      response.status(envelope.statusCode).json(envelope);
      return;
    }

    const traceId = this.createTraceId();
    this.logger.error(
      `Unhandled exception [${traceId}]`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    const envelope: ApiErrorResponse = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: HTTP_ERROR_LABELS[HttpStatus.INTERNAL_SERVER_ERROR],
      code: ApiErrorCode.SYS_INTERNAL,
      message: ApiErrorMessage[ApiErrorCode.SYS_INTERNAL],
      traceId,
    };
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(envelope);
  }

  private normalizeHttpException(exception: HttpException): ApiErrorResponse {
    const statusCode = exception.getStatus();
    const raw = exception.getResponse();
    const error =
      HTTP_ERROR_LABELS[statusCode] ?? HttpStatus[statusCode] ?? 'Error';

    if (statusCode === 401) {
      return {
        statusCode,
        error,
        code: ApiErrorCode.AUTH_INVALID_CREDENTIALS,
        message: ApiErrorMessage[ApiErrorCode.AUTH_INVALID_CREDENTIALS],
        traceId: this.createTraceId(),
      };
    }

    if (typeof raw === 'string') {
      return {
        statusCode,
        error,
        code: this.fallbackCode(statusCode),
        message: raw,
      };
    }

    const body = raw as Record<string, unknown>;
    const hasLegacyValidationMessages = Array.isArray(body.message);
    const code =
      typeof body.code === 'string' && body.code.length > 0
        ? body.code
        : hasLegacyValidationMessages
          ? ApiErrorCode.SYS_VALIDATION
          : this.fallbackCode(statusCode);
    const message = this.extractMessage(body, code);
    const details = this.extractDetails(body);

    const envelope: ApiErrorResponse = {
      statusCode,
      error,
      code,
      message,
      ...(details?.length ? { details } : {}),
    };

    if (statusCode >= 500) {
      envelope.traceId = this.createTraceId();
      this.logger.error(
        `HTTP ${statusCode} [${envelope.traceId}] code=${code}`,
        exception.stack,
      );
    }

    return envelope;
  }

  private extractMessage(body: Record<string, unknown>, code: string): string {
    if (typeof body.message === 'string' && body.message.length > 0) {
      return body.message;
    }
    if (Array.isArray(body.message) && body.message.length > 0) {
      return ApiErrorMessage[ApiErrorCode.SYS_VALIDATION];
    }
    const catalogMessage =
      ApiErrorMessage[code as keyof typeof ApiErrorMessage];
    if (catalogMessage) {
      return catalogMessage;
    }
    return this.fallbackMessage(code);
  }

  private extractDetails(
    body: Record<string, unknown>,
  ): ApiErrorDetail[] | undefined {
    if (Array.isArray(body.details)) {
      return body.details.filter(isApiErrorDetail);
    }
    if (Array.isArray(body.message)) {
      return (body.message as unknown[])
        .filter((item): item is string => typeof item === 'string')
        .map((message) => ({
          code: ApiErrorCode.SYS_VALIDATION,
          message,
        }));
    }
    return undefined;
  }

  private fallbackCode(statusCode: number): string {
    if (statusCode === 400) return ApiErrorCode.SYS_BAD_REQUEST;
    if (statusCode === 403) return ApiErrorCode.AUTH_FORBIDDEN;
    if (statusCode === 404) return ApiErrorCode.SYS_NOT_FOUND;
    if (statusCode === 401) return ApiErrorCode.AUTH_INVALID_CREDENTIALS;
    return statusCode >= 500
      ? ApiErrorCode.SYS_INTERNAL
      : ApiErrorCode.SYS_BAD_REQUEST;
  }

  private fallbackMessage(code: string): string {
    if (code === ApiErrorCode.SYS_VALIDATION) {
      return ApiErrorMessage[ApiErrorCode.SYS_VALIDATION];
    }
    if (code === ApiErrorCode.AUTH_FORBIDDEN) {
      return ApiErrorMessage[ApiErrorCode.AUTH_FORBIDDEN];
    }
    return ApiErrorMessage[ApiErrorCode.SYS_BAD_REQUEST];
  }

  private createTraceId(): string {
    return `AIC-${randomBytes(4).toString('hex').toUpperCase()}`;
  }
}
