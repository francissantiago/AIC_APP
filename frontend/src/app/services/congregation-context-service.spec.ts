import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CongregationType } from '@enums/congregation-type';
import { AuthService } from '@services/auth-service';
import { MeCongregationsService } from '@services/me-congregations-service';
import { of, throwError } from 'rxjs';
import { CongregationContextService } from './congregation-context-service';

const HQ_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_ID = '22222222-2222-2222-2222-222222222222';

const memberships = [
  {
    congregationId: HQ_ID,
    congregationName: 'Matriz',
    congregationType: CongregationType.HEADQUARTERS,
    isDefault: true,
    assignedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    congregationId: BRANCH_ID,
    congregationName: 'Filial Norte',
    congregationType: CongregationType.BRANCH,
    isDefault: false,
    assignedAt: '2026-01-02T00:00:00.000Z',
  },
];

function buildToken(defaultCongregationId?: string): string {
  const payload = btoa(JSON.stringify({ sub: 'user-1', defaultCongregationId }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${payload}.sig`;
}

describe('CongregationContextService', () => {
  let service: CongregationContextService;
  let meCongregations: { listMine: ReturnType<typeof vi.fn> };
  let accessToken = signal<string | null>(buildToken(HQ_ID));

  beforeEach(() => {
    sessionStorage.clear();
    accessToken = signal<string | null>(buildToken(HQ_ID));
    meCongregations = {
      listMine: vi.fn().mockReturnValue(of(memberships)),
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        CongregationContextService,
        {
          provide: AuthService,
          useValue: {
            accessToken,
            isAuthenticated: () => !!accessToken(),
          },
        },
        { provide: MeCongregationsService, useValue: meCongregations },
      ],
    });

    service = TestBed.inject(CongregationContextService);
  });

  it('prefers valid sessionStorage over defaults', async () => {
    sessionStorage.setItem('aic.activeCongregationId', BRANCH_ID);

    await service.initialize();

    expect(service.activeCongregationId()).toBe(BRANCH_ID);
  });

  it('ignores invalid sessionStorage and uses isDefault membership', async () => {
    sessionStorage.setItem('aic.activeCongregationId', 'invalid-id');

    await service.initialize();

    expect(service.activeCongregationId()).toBe(HQ_ID);
  });

  it('falls back to JWT default when no isDefault membership', async () => {
    meCongregations.listMine.mockReturnValue(
      of([
        {
          ...memberships[1],
          isDefault: false,
        },
        {
          ...memberships[0],
          isDefault: false,
        },
      ]),
    );
    accessToken.set(buildToken(BRANCH_ID));

    await service.initialize();

    expect(service.activeCongregationId()).toBe(BRANCH_ID);
  });

  it('switchActiveCongregation persists and increments contextVersion', async () => {
    await service.initialize();
    const versionBefore = service.contextVersion();

    service.switchActiveCongregation(BRANCH_ID);

    expect(service.activeCongregationId()).toBe(BRANCH_ID);
    expect(sessionStorage.getItem('aic.activeCongregationId')).toBe(BRANCH_ID);
    expect(service.contextVersion()).toBe(versionBefore + 1);
  });

  it('clear removes storage and resets signals', async () => {
    await service.initialize();
    service.clear();

    expect(service.activeCongregationId()).toBeNull();
    expect(service.memberships()).toEqual([]);
    expect(sessionStorage.getItem('aic.activeCongregationId')).toBeNull();
  });

  it('sets error when memberships list is empty', async () => {
    meCongregations.listMine.mockReturnValue(of([]));

    await service.initialize();

    expect(service.error()).toBe(true);
    expect(service.activeCongregationId()).toBeNull();
  });

  it('sets error when listMine fails', async () => {
    meCongregations.listMine.mockReturnValue(throwError(() => new Error('network')));

    await service.initialize();

    expect(service.error()).toBe(true);
  });
});
