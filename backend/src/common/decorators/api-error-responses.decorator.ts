import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../dto/api-error-response.dto';

/** Documenta envelope de erro padrão nos status HTTP comuns do MVP. */
export function ApiErrorResponses() {
  return applyDecorators(
    ApiResponse({ status: 400, type: ApiErrorResponseDto }),
    ApiResponse({ status: 401, type: ApiErrorResponseDto }),
    ApiResponse({ status: 403, type: ApiErrorResponseDto }),
    ApiResponse({ status: 404, type: ApiErrorResponseDto }),
    ApiResponse({ status: 409, type: ApiErrorResponseDto }),
    ApiResponse({ status: 422, type: ApiErrorResponseDto }),
    ApiResponse({ status: 500, type: ApiErrorResponseDto }),
  );
}
