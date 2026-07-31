import { HttpClient } from '@angular/common/http';
import { DestroyRef, inject, Injectable, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from 'environments/environment';
import { IAppVersionManifest } from '@interfaces/IAppVersionManifest';
import { IHealthResponse } from '@interfaces/IHealthResponse';
import { PwaUpdateService } from '@services/pwa-update-service';
import { catchError, map, Observable, of, switchMap, tap, timer } from 'rxjs';

const INITIAL_CHECK_DELAY_MS = 30_000;

@Injectable({
  providedIn: 'root',
})
export class AppVersionService {
  readonly #http = inject(HttpClient);
  readonly #destroyRef = inject(DestroyRef);
  readonly #pwaUpdateService = inject(PwaUpdateService);

  readonly currentVersion = signal(environment.version);
  readonly currentBuiltAt = signal(environment.builtAt);
  readonly #remoteVersion = signal<string | null>(null);
  readonly remoteVersion = this.#remoteVersion.asReadonly();
  readonly updateAvailable = computed(() => {
    const remote = this.#remoteVersion();
    const remoteMismatch = remote !== null && remote !== this.currentVersion();
    return remoteMismatch || this.#pwaUpdateService.swUpdateReady();
  });
  readonly checking = signal(false);
  readonly lastCheckAt = signal<string | null>(null);
  readonly backendVersion = signal<string | null>(null);

  #pollingStarted = false;

  startPolling(): void {
    if (this.#pollingStarted) {
      return;
    }

    const intervalMs = environment.versionCheckIntervalMs;
    if (intervalMs <= 0) {
      return;
    }

    this.#pollingStarted = true;

    timer(INITIAL_CHECK_DELAY_MS, intervalMs)
      .pipe(
        switchMap(() => this.checkForUpdate()),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  checkForUpdate(): Observable<void> {
    this.checking.set(true);

    return this.#http
      .get<IAppVersionManifest>(`/version.json?_=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache' },
      })
      .pipe(
        tap((manifest) => {
          this.#remoteVersion.set(manifest.version);
          this.lastCheckAt.set(new Date().toISOString());
          this.checking.set(false);
        }),
        catchError(() => {
          this.checking.set(false);
          return of(undefined);
        }),
        map(() => undefined),
      );
  }

  fetchBackendVersion(): void {
    this.#http
      .get<IHealthResponse>(`${environment.apiUrl}/health`)
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((response) => {
        if (response?.version) {
          this.backendVersion.set(response.version);
        }
      });
  }

  async reloadApplication(): Promise<void> {
    if (this.#pwaUpdateService.swUpdateReady()) {
      await this.#pwaUpdateService.activateUpdate();
    }

    window.location.reload();
  }
}
