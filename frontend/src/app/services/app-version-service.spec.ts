import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PwaUpdateService } from '@services/pwa-update-service';
import { of, throwError } from 'rxjs';
import { AppVersionService } from './app-version-service';

describe('AppVersionService', () => {
  let service: AppVersionService;
  let httpGet: ReturnType<typeof vi.fn>;
  let swUpdateReadySignal: ReturnType<typeof signal<boolean>>;
  let activateUpdateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    swUpdateReadySignal = signal(false);
    activateUpdateSpy = vi.fn().mockResolvedValue(true);
    httpGet = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: { get: httpGet } },
        {
          provide: PwaUpdateService,
          useValue: {
            swUpdateReady: swUpdateReadySignal.asReadonly(),
            activateUpdate: activateUpdateSpy,
          },
        },
      ],
    });

    service = TestBed.inject(AppVersionService);
  });

  it('currentVersion reflete environment.version', () => {
    expect(service.currentVersion()).toBeTruthy();
  });

  it('checkForUpdate não marca updateAvailable quando versões coincidem', () => {
    httpGet.mockReturnValue(
      of({
        version: service.currentVersion(),
        builtAt: service.currentBuiltAt(),
      }),
    );

    service.checkForUpdate().subscribe();

    expect(service.updateAvailable()).toBe(false);
  });

  it('checkForUpdate marca updateAvailable quando versão remota difere', () => {
    httpGet.mockReturnValue(
      of({
        version: '9.9.9',
        builtAt: '2026-07-26T19:00:00.000Z',
      }),
    );

    service.checkForUpdate().subscribe();

    expect(service.updateAvailable()).toBe(true);
    expect(service.remoteVersion()).toBe('9.9.9');
  });

  it('updateAvailable fica true quando swUpdateReady é true', () => {
    expect(service.updateAvailable()).toBe(false);

    swUpdateReadySignal.set(true);

    expect(service.updateAvailable()).toBe(true);
  });

  it('checkForUpdate falha silenciosamente em erro HTTP', () => {
    httpGet.mockReturnValue(throwError(() => ({ status: 404 })));

    service.checkForUpdate().subscribe();

    expect(service.remoteVersion()).toBeNull();
    expect(service.updateAvailable()).toBe(false);
  });

  it('reloadApplication ativa update do SW quando pronto', async () => {
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: reloadSpy },
    });

    swUpdateReadySignal.set(true);
    await service.reloadApplication();

    expect(activateUpdateSpy).toHaveBeenCalled();
    expect(reloadSpy).toHaveBeenCalled();
  });
});
