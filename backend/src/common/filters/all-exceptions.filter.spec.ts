import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  HttpStatus,
} from '@nestjs/common';
import { ApiErrorCode, ApiErrorMessage } from '../errors/api-error.types';
import { ApiException } from '../errors/api.exception';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  const createHost = () => {
    const json = jest.fn<(body: Record<string, unknown>) => void>();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost;
    return { host, status, json };
  };

  const firstBody = (
    json: jest.MockedFunction<(body: Record<string, unknown>) => void>,
  ): Record<string, unknown> => {
    const call = json.mock.calls[0];
    if (!call?.[0]) {
      throw new Error('Expected filter to write a response body');
    }
    return call[0];
  };

  it('normaliza HttpException com code no envelope', () => {
    const { host, status, json } = createHost();

    filter.catch(
      new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.MEMBERS_EMAIL_IN_USE,
        message: ApiErrorMessage[ApiErrorCode.MEMBERS_EMAIL_IN_USE],
        details: [
          {
            field: 'email',
            code: ApiErrorCode.MEMBERS_EMAIL_IN_USE,
            message: ApiErrorMessage[ApiErrorCode.MEMBERS_EMAIL_IN_USE],
          },
        ],
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        error: 'Conflict',
        code: ApiErrorCode.MEMBERS_EMAIL_IN_USE,
        message: ApiErrorMessage[ApiErrorCode.MEMBERS_EMAIL_IN_USE],
        details: [
          expect.objectContaining({
            field: 'email',
            code: ApiErrorCode.MEMBERS_EMAIL_IN_USE,
          }),
        ],
      }),
    );
    expect(firstBody(json).stack).toBeUndefined();
  });

  it('normaliza validação SYS.VALIDATION com details', () => {
    const { host, status, json } = createHost();

    filter.catch(
      new BadRequestException({
        code: ApiErrorCode.SYS_VALIDATION,
        message: ApiErrorMessage[ApiErrorCode.SYS_VALIDATION],
        details: [
          {
            field: 'email',
            code: ApiErrorCode.SYS_VALIDATION,
            message: 'email must be an email',
          },
        ],
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        code: ApiErrorCode.SYS_VALIDATION,
        message: ApiErrorMessage[ApiErrorCode.SYS_VALIDATION],
        details: [
          expect.objectContaining({
            field: 'email',
            message: 'email must be an email',
          }),
        ],
      }),
    );
  });

  it('mapeia string[] legado de validação para details', () => {
    const { host, json } = createHost();

    filter.catch(
      new BadRequestException([
        'email must be an email',
        'name should not be empty',
      ]),
      host,
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ApiErrorCode.SYS_VALIDATION,
        details: [
          {
            code: ApiErrorCode.SYS_VALIDATION,
            message: 'email must be an email',
          },
          {
            code: ApiErrorCode.SYS_VALIDATION,
            message: 'name should not be empty',
          },
        ],
      }),
    );
  });

  it('força AUTH.INVALID_CREDENTIALS em 401 com traceId', () => {
    const { host, json } = createHost();

    filter.catch(
      new ApiException(HttpStatus.UNAUTHORIZED, {
        code: ApiErrorCode.AUTH_INVALID_CREDENTIALS,
        message: 'qualquer detalhe interno',
      }),
      host,
    );

    const body = firstBody(json);
    expect(body.statusCode).toBe(401);
    expect(body.code).toBe(ApiErrorCode.AUTH_INVALID_CREDENTIALS);
    expect(body.message).toBe(
      ApiErrorMessage[ApiErrorCode.AUTH_INVALID_CREDENTIALS],
    );
    expect(typeof body.traceId).toBe('string');
    expect(body.traceId).toMatch(/^AIC-[0-9A-F]{8}$/);
  });

  it('responde 500 SYS.INTERNAL com traceId e sem stack no body', () => {
    const { host, status, json } = createHost();
    const error = new Error('boom SQL SELECT * FROM secrets');

    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const body = firstBody(json);
    expect(body.statusCode).toBe(500);
    expect(body.error).toBe('Internal Server Error');
    expect(body.code).toBe(ApiErrorCode.SYS_INTERNAL);
    expect(body.message).toBe(ApiErrorMessage[ApiErrorCode.SYS_INTERNAL]);
    expect(typeof body.traceId).toBe('string');
    expect(body.traceId).toMatch(/^AIC-[0-9A-F]{8}$/);
    expect(body.stack).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain('SELECT');
    expect(JSON.stringify(body)).not.toContain('boom');
  });

  it('aceita ConflictException com objeto { code, message }', () => {
    const { host, json } = createHost();

    filter.catch(
      new ConflictException({
        code: ApiErrorCode.USERS_EMAIL_IN_USE,
        message: ApiErrorMessage[ApiErrorCode.USERS_EMAIL_IN_USE],
      }),
      host,
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ApiErrorCode.USERS_EMAIL_IN_USE,
        message: ApiErrorMessage[ApiErrorCode.USERS_EMAIL_IN_USE],
      }),
    );
  });
});
