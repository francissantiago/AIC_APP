import { DestroyRef, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

export interface EntityMemberRef {
  memberId: string;
}

export interface EntityMembersListLoadOptions {
  showLoading?: boolean;
}

export interface EntityMembersListLoaderConfig<T> {
  members: WritableSignal<T[]>;
  loading: WritableSignal<boolean>;
  error: WritableSignal<boolean>;
  fetch: () => Observable<{ data: T[] }>;
  destroyRef: DestroyRef;
}

export interface ApplyEntityMembershipMutationOptions<T extends EntityMemberRef> {
  loader: EntityMembersListLoader<T>;
  members: WritableSignal<T[]>;
  loading: WritableSignal<boolean>;
  upsert?: T;
  removeMemberId?: string;
  reloadOptions?: () => void;
}

export function upsertEntityMember<T extends EntityMemberRef>(
  list: readonly T[],
  item: T,
): T[] {
  const exists = list.some((entry) => entry.memberId === item.memberId);
  if (exists) {
    return list.map((entry) => (entry.memberId === item.memberId ? item : entry));
  }
  return [...list, item];
}

export function removeEntityMember<T extends EntityMemberRef>(
  list: readonly T[],
  memberId: string,
): T[] {
  return list.filter((entry) => entry.memberId !== memberId);
}

export class EntityMembersListLoader<T> {
  readonly #members: WritableSignal<T[]>;
  readonly #loading: WritableSignal<boolean>;
  readonly #error: WritableSignal<boolean>;
  readonly #fetch: () => Observable<{ data: T[] }>;
  readonly #destroyRef: DestroyRef;

  #seq = 0;

  constructor(config: EntityMembersListLoaderConfig<T>) {
    this.#members = config.members;
    this.#loading = config.loading;
    this.#error = config.error;
    this.#fetch = config.fetch;
    this.#destroyRef = config.destroyRef;
  }

  invalidatePending(): void {
    this.#seq++;
  }

  reload(options: EntityMembersListLoadOptions = {}): void {
    const showLoading = options.showLoading ?? true;
    const seq = ++this.#seq;

    if (showLoading) {
      this.#loading.set(true);
      this.#error.set(false);
    }

    this.#fetch()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          if (seq !== this.#seq) {
            return;
          }
          this.#members.set(response.data);
          this.#loading.set(false);
        },
        error: () => {
          if (seq !== this.#seq) {
            return;
          }
          this.#members.set([]);
          this.#loading.set(false);
          this.#error.set(true);
        },
      });
  }
}

/** Atualização padrão após vincular ou desvincular membro/participante. */
export function applyEntityMembershipMutation<T extends EntityMemberRef>(
  options: ApplyEntityMembershipMutationOptions<T>,
): void {
  options.loader.invalidatePending();
  options.loading.set(false);

  if (options.upsert) {
    options.members.update((list) => upsertEntityMember(list, options.upsert!));
  } else if (options.removeMemberId) {
    options.members.update((list) => removeEntityMember(list, options.removeMemberId!));
  }

  options.reloadOptions?.();
}
