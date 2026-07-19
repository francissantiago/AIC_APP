import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '../../../common/errors/api-error.types';
import { ApiException } from '../../../common/errors/api.exception';
import { UserCongregationsService } from '../user-congregations.service';
import { CongregationContextGuard } from './congregation-context.guard';

describe('CongregationContextGuard', () => {
  const userCongregationsService = {
    isMember: jest.fn(),
    resolveDefaultForUser: jest.fn(),
  };

  const guard = new CongregationContextGuard(
    userCongregationsService as unknown as UserCongregationsService,
  );

  const buildContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('permite quando request.user está ausente', async () => {
    const request: Record<string, unknown> = { headers: {} };

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
    expect(userCongregationsService.isMember).not.toHaveBeenCalled();
    expect(
      userCongregationsService.resolveDefaultForUser,
    ).not.toHaveBeenCalled();
  });

  it('usa header válido como congregação ativa', async () => {
    const congregationId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const request = {
      user: { id: 'user-1' },
      headers: { 'x-congregation-id': congregationId },
    };
    userCongregationsService.isMember.mockResolvedValue(true);

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);

    expect(userCongregationsService.isMember).toHaveBeenCalledWith(
      'user-1',
      congregationId,
    );
    expect(request.activeCongregationId).toBe(congregationId);
  });

  it('usa primeiro valor quando header é array', async () => {
    const congregationId = '11111111-2222-3333-4444-555555555555';
    const request = {
      user: { id: 'user-1' },
      headers: { 'x-congregation-id': [congregationId, 'ignored'] },
    };
    userCongregationsService.isMember.mockResolvedValue(true);

    await guard.canActivate(buildContext(request));

    expect(userCongregationsService.isMember).toHaveBeenCalledWith(
      'user-1',
      congregationId,
    );
  });

  it('lança 403 quando header aponta para congregação sem membership', async () => {
    const request = {
      user: { id: 'user-1' },
      headers: { 'x-congregation-id': 'invalid-id' },
    };
    userCongregationsService.isMember.mockResolvedValue(false);

    try {
      await guard.canActivate(buildContext(request));
      fail('esperava ApiException');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect((error as ApiException).getResponse()).toMatchObject({
        code: ApiErrorCode.CONGREGATIONS_CONTEXT_DENIED,
      });
    }
  });

  it('resolve default quando header ausente', async () => {
    const defaultId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const request = {
      user: { id: 'user-1' },
      headers: {},
    };
    userCongregationsService.resolveDefaultForUser.mockResolvedValue({
      id: defaultId,
    });

    await guard.canActivate(buildContext(request));

    expect(userCongregationsService.resolveDefaultForUser).toHaveBeenCalledWith(
      'user-1',
    );
    expect(request.activeCongregationId).toBe(defaultId);
  });
});
