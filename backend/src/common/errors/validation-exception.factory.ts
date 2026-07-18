import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import {
  ApiErrorCode,
  ApiErrorDetail,
  ApiErrorMessage,
} from './api-error.types';

function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): ApiErrorDetail[] {
  const details: ApiErrorDetail[] = [];

  for (const error of errors) {
    const field = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      for (const message of Object.values(error.constraints)) {
        details.push({
          field,
          code: ApiErrorCode.SYS_VALIDATION,
          message,
        });
      }
    }

    if (error.children?.length) {
      details.push(...flattenValidationErrors(error.children, field));
    }
  }

  return details;
}

export function createValidationExceptionFactory() {
  return (errors: ValidationError[]): BadRequestException => {
    const details = flattenValidationErrors(errors);
    return new BadRequestException({
      code: ApiErrorCode.SYS_VALIDATION,
      message: ApiErrorMessage[ApiErrorCode.SYS_VALIDATION],
      details,
    });
  };
}
