import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  model,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { IMemberOption } from '@interfaces/IMemberOption';
import { MembersService } from '@services/members-service';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-member-filiation-autocomplete',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './member-filiation-autocomplete.html',
  styleUrl: './member-filiation-autocomplete.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberFiliationAutocomplete implements OnInit {
  readonly #membersService = inject(MembersService);
  readonly #destroyRef = inject(DestroyRef);

  readonly labelKey = input.required<string>();
  readonly nameControl = input.required<FormControl<string>>();
  readonly linkedMemberId = model<string | null>(null);
  readonly excludeMemberId = input<string | null>(null);
  readonly inputId = input.required<string>();

  readonly options = signal<IMemberOption[]>([]);
  readonly loading = signal(false);
  readonly listOpen = signal(false);
  readonly activeIndex = signal(-1);
  readonly listboxId = signal('');
  readonly #linkedFullName = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.linkedMemberId();
      if (!id) {
        return;
      }
      if (!this.#linkedFullName()) {
        const name = this.nameControl().value.trim();
        if (name) {
          this.#linkedFullName.set(name);
        }
      }
    });
  }

  ngOnInit(): void {
    this.listboxId.set(`${this.inputId()}-listbox`);

    this.nameControl()
      .valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((value) => {
        const trimmed = value.trim();
        const linkedName = this.#linkedFullName();
        if (this.linkedMemberId() && linkedName && trimmed !== linkedName) {
          this.linkedMemberId.set(null);
          this.#linkedFullName.set(null);
        }
        if (trimmed.length < 3) {
          this.options.set([]);
          this.listOpen.set(false);
          this.activeIndex.set(-1);
          return;
        }
        this.#search(trimmed);
      });
  }

  isLinked(): boolean {
    return !!this.linkedMemberId();
  }

  clearLink(): void {
    this.linkedMemberId.set(null);
    this.#linkedFullName.set(null);
  }

  selectOption(option: IMemberOption): void {
    this.nameControl().setValue(option.fullName, { emitEvent: false });
    this.linkedMemberId.set(option.id);
    this.#linkedFullName.set(option.fullName);
    this.options.set([]);
    this.listOpen.set(false);
    this.activeIndex.set(-1);
  }

  onFocus(): void {
    if (this.options().length > 0) {
      this.listOpen.set(true);
    }
  }

  onBlur(): void {
    // Delay para permitir click na opção antes de fechar.
    window.setTimeout(() => {
      this.listOpen.set(false);
      this.activeIndex.set(-1);
    }, 150);
  }

  onKeydown(event: KeyboardEvent): void {
    const items = this.options();
    if (!this.listOpen() || items.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.update((index) => (index + 1) % items.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.update((index) => (index <= 0 ? items.length - 1 : index - 1));
      return;
    }
    if (event.key === 'Enter') {
      const active = items[this.activeIndex()];
      if (active) {
        event.preventDefault();
        this.selectOption(active);
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.listOpen.set(false);
      this.activeIndex.set(-1);
    }
  }

  activeOptionId(): string | null {
    const index = this.activeIndex();
    if (index < 0) {
      return null;
    }
    return `${this.listboxId()}-option-${index}`;
  }

  #search(q: string): void {
    this.loading.set(true);
    const excludeMemberId = this.excludeMemberId() ?? undefined;
    this.#membersService
      .options({ q, limit: 15, excludeMemberId })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (items) => {
          this.options.set(items);
          this.listOpen.set(true);
          this.activeIndex.set(items.length > 0 ? 0 : -1);
          this.loading.set(false);
        },
        error: () => {
          this.options.set([]);
          this.listOpen.set(false);
          this.activeIndex.set(-1);
          this.loading.set(false);
        },
      });
  }
}
