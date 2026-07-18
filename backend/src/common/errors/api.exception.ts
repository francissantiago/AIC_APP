import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorBody, ApiErrorDetail } from './api-error.types';

export class ApiException extends HttpException {
  constructor(
    status: HttpStatus | number,
    body: {
      code: string;
      message: string;
      details?: ApiErrorDetail[];
    },
  ) {
    const payload: ApiErrorBody = {
      code: body.code,
      message: body.message,
      ...(body.details?.length ? { details: body.details } : {}),
    };
    super(payload, status);
  }
}
