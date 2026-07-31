import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { PwaUpdateService } from './pwa-update-service';

describe('PwaUpdateService', () => {
  let versionUpdates$: Subject<VersionReadyEvent>;
  let activateUpdateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    versionUpdates$ = new Subject<VersionReadyEvent>();
    activateUpdateSpy = vi.fn().mockResolvedValue(true);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: SwUpdate,
          useValue: {
            isEnabled: true,
            versionUpdates: versionUpdates$.asObservable(),
            activateUpdate: activateUpdateSpy,
          },
        },
      ],
    });
  });

  it('marca swUpdateReady em VERSION_READY', () => {
    const service = TestBed.inject(PwaUpdateService);

    expect(service.swUpdateReady()).toBe(false);

    versionUpdates$.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'a' },
      latestVersion: { hash: 'b' },
    });

    expect(service.swUpdateReady()).toBe(true);
  });

  it('activateUpdate delega para SwUpdate quando habilitado', async () => {
    const service = TestBed.inject(PwaUpdateService);

    await expect(service.activateUpdate()).resolves.toBe(true);
    expect(activateUpdateSpy).toHaveBeenCalled();
  });

  it('não escuta quando SwUpdate está desabilitado', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SwUpdate,
          useValue: {
            isEnabled: false,
            versionUpdates: versionUpdates$.asObservable(),
            activateUpdate: activateUpdateSpy,
          },
        },
      ],
    });

    const service = TestBed.inject(PwaUpdateService);
    versionUpdates$.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'a' },
      latestVersion: { hash: 'b' },
    });

    expect(service.swUpdateReady()).toBe(false);
  });
});
