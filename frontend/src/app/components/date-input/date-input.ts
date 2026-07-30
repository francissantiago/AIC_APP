import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { DatePickerCalendar } from '@components/date-picker-calendar/date-picker-calendar';
import { DateDisplayService } from '@services/date-display-service';
import { I18nService } from '@services/i18n-service';
import { isIsoDateInRange, parseFlexibleDateInput } from '@utils/date-display.util';

const DEFAULT_INPUT_CLASS =
  'w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100 disabled:cursor-not-allowed';

@Component({
  selector: 'app-date-input',
  imports: [ReactiveFormsModule, TranslatePipe, DatePickerCalendar],
  templateUrl: './date-input.html',
  styleUrl: './date-input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateInput implements OnInit {
  readonly #dates = inject(DateDisplayService);
  readonly #i18n = inject(I18nService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #host = inject(ElementRef<HTMLElement>);
  readonly #document = inject(DOCUMENT);

  readonly control = input.required<FormControl<string>>();
  readonly inputId = input.required<string>();
  readonly min = input<string | null>(null);
  readonly max = input<string | null>(null);
  readonly disabled = input(false);
  readonly testId = input<string | null>(null);
  readonly inputClass = input(DEFAULT_INPUT_CLASS);
  readonly ariaInvalid = input<boolean | null>(null);
  readonly ariaDescribedBy = input<string | null>(null);

  readonly displayControl = new FormControl('', { nonNullable: true });
  readonly calendarOpen = signal(false);
  readonly parseError = signal(false);

  readonly calendarRef = viewChild(DatePickerCalendar);

  ngOnInit(): void {
    this.#syncDisplayFromControl(this.control().value);
    this.#syncDisabledState();

    this.control()
      .valueChanges.pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((value) => {
        this.#syncDisplayFromControl(value);
      });

    this.control()
      .statusChanges.pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.#syncDisabledState();
      });

    this.#document.addEventListener('click', this.#handleDocumentClick);
    this.#destroyRef.onDestroy(() => {
      this.#document.removeEventListener('click', this.#handleDocumentClick);
    });
  }

  toggleCalendar(): void {
    if (this.isDisabled()) {
      return;
    }
    const next = !this.calendarOpen();
    this.calendarOpen.set(next);
    if (next) {
      queueMicrotask(() => this.calendarRef()?.syncViewToSelected());
    }
  }

  closeCalendar(): void {
    this.calendarOpen.set(false);
  }

  isDisabled(): boolean {
    return this.disabled() || this.control().disabled;
  }

  onInputBlur(): void {
    this.#commitDisplayValue();
    window.setTimeout(() => this.closeCalendar(), 150);
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    this.displayControl.setValue(text.trim());
    this.#commitDisplayValue();
  }

  onDaySelected(iso: string): void {
    this.control().setValue(iso);
    this.#clearInvalidDateError();
    this.parseError.set(false);
    this.#syncDisplayFromControl(iso);
    this.closeCalendar();
  }

  readonly #handleDocumentClick = (event: MouseEvent): void => {
    if (!this.calendarOpen()) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    if (!this.#host.nativeElement.contains(target)) {
      this.closeCalendar();
    }
  };

  onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeCalendar();
    }
  }

  #commitDisplayValue(): void {
    const text = this.displayControl.value.trim();
    if (!text) {
      this.control().setValue('');
      this.#clearInvalidDateError();
      this.parseError.set(false);
      return;
    }

    const iso = parseFlexibleDateInput(text, this.#i18n.currentLang());
    if (!iso || !isIsoDateInRange(iso, this.min(), this.max())) {
      this.parseError.set(true);
      this.#setInvalidDateError();
      return;
    }

    this.control().setValue(iso);
    this.#clearInvalidDateError();
    this.parseError.set(false);
    this.displayControl.setValue(this.#dates.format(iso, 'date'), { emitEvent: false });
  }

  #syncDisplayFromControl(iso: string): void {
    if (!iso) {
      this.displayControl.setValue('', { emitEvent: false });
      return;
    }
    this.displayControl.setValue(this.#dates.format(iso, 'date'), { emitEvent: false });
    this.parseError.set(false);
  }

  #syncDisabledState(): void {
    if (this.isDisabled()) {
      this.displayControl.disable({ emitEvent: false });
      this.closeCalendar();
      return;
    }
    this.displayControl.enable({ emitEvent: false });
  }

  #setInvalidDateError(): void {
    const control = this.control();
    control.setErrors({ ...control.errors, invalidDate: true });
  }

  #clearInvalidDateError(): void {
    const control = this.control();
    const errors = control.errors;
    if (!errors?.['invalidDate']) {
      return;
    }
    const { invalidDate: _removed, ...rest } = errors;
    control.setErrors(Object.keys(rest).length > 0 ? rest : null);
  }
}
