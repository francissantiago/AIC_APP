import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ActiveCongregation = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ activeCongregationId?: string }>();
    return request.activeCongregationId;
  },
);
