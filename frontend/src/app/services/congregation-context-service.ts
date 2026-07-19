import { computed, inject, Injectable, signal } from '@angular/core';
import { IUserCongregation } from '@interfaces/IUserCongregation';
import { AuthService } from '@services/auth-service';
import { MeCongregationsService } from '@services/me-congregations-service';
import { decodeJwtPayload } from '@utils/jwt-payload';
import { firstValueFrom } from 'rxjs';

const ACTIVE_CONGREGATION_STORAGE_KEY = 'aic.activeCongregationId';

@Injectable({
  providedIn: 'root',
})
export class CongregationContextService {
  readonly #auth = inject(AuthService);
  readonly #meCongregations = inject(MeCongregationsService);

  readonly memberships = signal<IUserCongregation[]>([]);
  readonly activeCongregationId = signal<string | null>(null);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly contextVersion = signal(0);
  readonly contextDeniedMessage = signal(false);

  readonly activeMembership = computed(() => {
    const activeId = this.activeCongregationId();
    if (!activeId) {
      return null;
    }
    return this.memberships().find((item) => item.congregationId === activeId) ?? null;
  });

  readonly hasMultipleMemberships = computed(() => this.memberships().length > 1);

  readonly selectorVisible = computed(
    () =>
      this.#auth.isAuthenticated() &&
      !this.loading() &&
      !this.error() &&
      this.hasMultipleMemberships(),
  );

  async initialize(): Promise<void> {
    const token = this.#auth.accessToken();
    if (!token) {
      this.clear();
      return;
    }

    this.loading.set(true);
    this.error.set(false);

    try {
      const memberships = await firstValueFrom(this.#meCongregations.listMine());
      this.memberships.set(memberships);

      if (memberships.length === 0) {
        this.error.set(true);
        this.activeCongregationId.set(null);
        this.#clearStorage();
        return;
      }

      const resolved = this.#resolveActiveId(memberships, token);
      this.#applyActiveId(resolved);
    } catch {
      this.error.set(true);
      this.memberships.set([]);
      this.activeCongregationId.set(null);
      this.#clearStorage();
    } finally {
      this.loading.set(false);
    }
  }

  switchActiveCongregation(congregationId: string): void {
    const membership = this.memberships().find((item) => item.congregationId === congregationId);
    if (!membership) {
      return;
    }

    this.#applyActiveId(congregationId);
    this.contextVersion.update((value) => value + 1);
  }

  reresolveAfterDenied(): void {
    const token = this.#auth.accessToken();
    const memberships = this.memberships();
    if (!token || memberships.length === 0) {
      return;
    }

    this.#clearStorage();
    const resolved = this.#resolveActiveId(memberships, token, true);
    this.#applyActiveId(resolved);
    this.contextVersion.update((value) => value + 1);
    this.contextDeniedMessage.set(true);
  }

  clearContextDeniedMessage(): void {
    this.contextDeniedMessage.set(false);
  }

  clear(): void {
    this.memberships.set([]);
    this.activeCongregationId.set(null);
    this.loading.set(false);
    this.error.set(false);
    this.contextVersion.set(0);
    this.contextDeniedMessage.set(false);
    this.#clearStorage();
  }

  readJwtDefaultCongregationId(token: string): string | null {
    return decodeJwtPayload(token)?.defaultCongregationId ?? null;
  }

  #resolveActiveId(memberships: IUserCongregation[], token: string, ignoreStorage = false): string {
    const ids = new Set(memberships.map((item) => item.congregationId));

    if (!ignoreStorage) {
      const stored = this.#readStorage();
      if (stored && ids.has(stored)) {
        return stored;
      }
    }

    const defaultMembership = memberships.find((item) => item.isDefault);
    if (defaultMembership) {
      return defaultMembership.congregationId;
    }

    const jwtDefault = this.readJwtDefaultCongregationId(token);
    if (jwtDefault && ids.has(jwtDefault)) {
      return jwtDefault;
    }

    return memberships[0]!.congregationId;
  }

  #applyActiveId(congregationId: string): void {
    this.activeCongregationId.set(congregationId);
    this.#writeStorage(congregationId);
  }

  #readStorage(): string | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }
    return sessionStorage.getItem(ACTIVE_CONGREGATION_STORAGE_KEY);
  }

  #writeStorage(congregationId: string): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    sessionStorage.setItem(ACTIVE_CONGREGATION_STORAGE_KEY, congregationId);
  }

  #clearStorage(): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    sessionStorage.removeItem(ACTIVE_CONGREGATION_STORAGE_KEY);
  }
}
