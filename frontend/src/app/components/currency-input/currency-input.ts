import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import {
  formatCurrencyInput,
  maskCurrencyDigits,
  parseCurrencyInput,
} from '@utils/currency-input.util';

const DEFAULT_INPUT_CLASS =
  'w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100 disabled:cursor-not-allowed';

@Component({
  selector: 'app-currency-input',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './currency-input.html',
  styleUrl: './currency-input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrencyInput implements OnInit {
  readonly #destroyRef = inject(DestroyRef);

  readonly control = input.required<FormControl<number | null>>();
  readonly inputId = input.required<string>();
  readonly disabled = input(false);
  readonly testId = input<string | null>(null);
  readonly inputClass = input(DEFAULT_INPUT_CLASS);
  readonly ariaInvalid = input<boolean | null>(null);
  readonly ariaDescribedBy = input<string | null>(null);
  readonly currencyCode = input('BRL');
  readonly locale = input('pt-BR');

  readonly displayControl = new FormControl('', { nonNullable: true });
  readonly parseError = signal(false);

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

    this.displayControl.valueChanges
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((text) => {
        const masked = maskCurrencyDigits(text);
        if (masked !== text) {
          this.displayControl.setValue(masked, { emitEvent: false });
        }
      });
  }

  isDisabled(): boolean {
    return this.disabled() || this.control().disabled;
  }

  onBlur(): void {
    this.#commitDisplayValue();
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    this.displayControl.setValue(maskCurrencyDigits(text));
    this.#commitDisplayValue();
  }

  #commitDisplayValue(): void {
    const text = this.displayControl.value.trim();
    if (!text) {
      this.control().setValue(null);
      this.#clearInvalidCurrencyError();
      this.parseError.set(false);
      return;
    }

    const parsed = parseCurrencyInput(text);
    if (parsed == null) {
      this.parseError.set(true);
      this.#setInvalidCurrencyError();
      return;
    }

    this.control().setValue(parsed);
    this.#clearInvalidCurrencyError();
    this.parseError.set(false);
    this.displayControl.setValue(this.#format(parsed), { emitEvent: false });
  }

  #syncDisplayFromControl(value: number | null): void {
    if (value == null || !Number.isFinite(value)) {
      this.displayControl.setValue('', { emitEvent: false });
      return;
    }
    this.displayControl.setValue(this.#format(value), { emitEvent: false });
    this.parseError.set(false);
  }

  #syncDisabledState(): void {
    if (this.isDisabled()) {
      this.displayControl.disable({ emitEvent: false });
      return;
    }
    this.displayControl.enable({ emitEvent: false });
  }

  #format(value: number): string {
    return formatCurrencyInput(value, this.locale(), this.currencyCode());
  }

  #setInvalidCurrencyError(): void {
    const control = this.control();
    control.setErrors({ ...control.errors, invalidCurrency: true });
  }

  #clearInvalidCurrencyError(): void {
    const control = this.control();
    const errors = control.errors;
    if (!errors?.['invalidCurrency']) {
      return;
    }
    const { invalidCurrency: _removed, ...rest } = errors;
    control.setErrors(Object.keys(rest).length > 0 ? rest : null);
  }
}
