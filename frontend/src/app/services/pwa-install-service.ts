import { DestroyRef, inject, Injectable, computed, signal } from '@angular/core';
import { IBeforeInstallPromptEvent } from '@interfaces/IBeforeInstallPromptEvent';

const DISMISS_STORAGE_KEY = 'aic.pwa.installDismissed';

@Injectable({
  providedIn: 'root',
})
export class PwaInstallService {
  readonly #destroyRef = inject(DestroyRef);

  readonly #deferredPrompt = signal<IBeforeInstallPromptEvent | null>(null);
  readonly #isInstalled = signal(this.#detectInstalled());
  readonly #dismissed = signal(this.#readDismissed());

  readonly canInstall = computed(() => this.#deferredPrompt() !== null && !this.#isInstalled());
  readonly isInstalled = this.#isInstalled.asReadonly();
  readonly dismissed = this.#dismissed.asReadonly();

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    const onBeforeInstallPrompt = (event: Event): void => {
      event.preventDefault();
      this.#deferredPrompt.set(event as IBeforeInstallPromptEvent);
    };

    const onAppInstalled = (): void => {
      this.#deferredPrompt.set(null);
      this.#isInstalled.set(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    this.#destroyRef.onDestroy(() => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    });
  }

  async promptInstall(): Promise<'accepted' | 'dismissed' | null> {
    const promptEvent = this.#deferredPrompt();
    if (!promptEvent) {
      return null;
    }

    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    this.#deferredPrompt.set(null);

    if (outcome === 'accepted') {
      this.#isInstalled.set(true);
    }

    return outcome;
  }

  dismiss(): void {
    this.#dismissed.set(true);
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, '1');
    } catch {
      // ignore storage failures (private mode / quota)
    }
  }

  #detectInstalled(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const matchMedia = window.matchMedia?.bind(window);
    const standaloneDisplay = matchMedia ? matchMedia('(display-mode: standalone)').matches : false;
    const iosStandalone =
      'standalone' in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

    return standaloneDisplay || iosStandalone;
  }

  #readDismissed(): boolean {
    if (typeof localStorage === 'undefined') {
      return false;
    }

    try {
      return localStorage.getItem(DISMISS_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }
}
