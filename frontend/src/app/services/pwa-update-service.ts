import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PwaUpdateService {
  readonly #swUpdate = inject(SwUpdate);
  readonly #destroyRef = inject(DestroyRef);

  readonly #swUpdateReady = signal(false);
  readonly swUpdateReady = this.#swUpdateReady.asReadonly();

  constructor() {
    if (!this.#swUpdate.isEnabled) {
      return;
    }

    this.#swUpdate.versionUpdates
      .pipe(
        filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => {
        this.#swUpdateReady.set(true);
      });
  }

  activateUpdate(): Promise<boolean> {
    if (!this.#swUpdate.isEnabled) {
      return Promise.resolve(false);
    }

    return this.#swUpdate.activateUpdate();
  }
}
