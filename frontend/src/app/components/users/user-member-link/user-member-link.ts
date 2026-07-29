import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { IMemberOption } from '@interfaces/IMemberOption';
import { MembersService } from '@services/members-service';
import { debounceTime, distinctUntilChanged } from 'rxjs';

export interface UserMemberPrefill {
  fullName: string;
  email: string | null;
}

@Component({
  selector: 'app-user-member-link',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './user-member-link.html',
  styleUrl: './user-member-link.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserMemberLink implements OnInit {
  readonly #membersService = inject(MembersService);
  readonly #destroyRef = inject(DestroyRef);

  readonly linkedMemberId = input<string | null>(null);
  readonly linkedMemberIdChange = output<string | null>();
  readonly linkedToUserId = input<string | null>(null);
  readonly initialMemberFullName = input<string | null>(null);
  readonly inputId = input('user-member-link-search');

  readonly memberSelected = output<UserMemberPrefill>();
  readonly linkCleared = output<void>();

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly options = signal<IMemberOption[]>([]);
  readonly loading = signal(false);
  readonly listOpen = signal(false);
  readonly activeIndex = signal(-1);
  readonly listboxId = signal('');
  readonly #linkedFullName = signal<string | null>(null);

  constructor() {
    effect(() => {
      const initialName = this.initialMemberFullName();
      const linkedId = this.linkedMemberId();
      if (linkedId && initialName && !this.searchControl.value.trim()) {
        this.searchControl.setValue(initialName, { emitEvent: false });
        this.#linkedFullName.set(initialName);
      }
    });
  }

  ngOnInit(): void {
    this.listboxId.set(`${this.inputId()}-listbox`);

    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((value) => {
        const trimmed = value.trim();
        const linkedName = this.#linkedFullName();
        if (this.linkedMemberId() && linkedName && trimmed !== linkedName) {
          this.linkedMemberIdChange.emit(null);
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
    this.linkedMemberIdChange.emit(null);
    this.#linkedFullName.set(null);
    this.searchControl.setValue('', { emitEvent: false });
    this.options.set([]);
    this.listOpen.set(false);
    this.linkCleared.emit();
  }

  selectOption(option: IMemberOption): void {
    this.searchControl.setValue(option.fullName, { emitEvent: false });
    this.linkedMemberIdChange.emit(option.id);
    this.#linkedFullName.set(option.fullName);
    this.options.set([]);
    this.listOpen.set(false);
    this.activeIndex.set(-1);

    this.#membersService
      .getById(option.id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (member) => {
          this.memberSelected.emit({
            fullName: member.fullName,
            email: member.email,
          });
        },
        error: () => {
          this.memberSelected.emit({
            fullName: option.fullName,
            email: null,
          });
        },
      });
  }

  onFocus(): void {
    if (this.options().length > 0) {
      this.listOpen.set(true);
    }
  }

  onBlur(): void {
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
    const linkedToUserId = this.linkedToUserId() ?? undefined;
    this.#membersService
      .options({
        q,
        limit: 15,
        unlinkedOnly: true,
        linkedToUserId,
      })
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
