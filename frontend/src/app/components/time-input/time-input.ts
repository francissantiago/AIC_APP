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
import { DateDisplayService } from '@services/date-display-service';
import { parseFlexibleTimeInput } from '@utils/date-display.util';

const DEFAULT_INPUT_CLASS =
  'w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100 disabled:cursor-not-allowed';

@Component({
  selector: 'app-time-input',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './time-input.html',
  styleUrl: './time-input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeInput implements OnInit {
  readonly #dates = inject(DateDisplayService);
  readonly #destroyRef = inject(DestroyRef);

  readonly control = input.required<FormControl<string>>();
  readonly inputId = input.required<string>();
  readonly disabled = input(false);
  readonly testId = input<string | null>(null);
  readonly inputClass = input(DEFAULT_INPUT_CLASS);
  readonly ariaInvalid = input<boolean | null>(null);
  readonly ariaDescribedBy = input<string | null>(null);

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
    this.displayControl.setValue(text.trim());
    this.#commitDisplayValue();
  }

  #commitDisplayValue(): void {
    const text = this.displayControl.value.trim();
    if (!text) {
      this.control().setValue('');
      this.#clearInvalidTimeError();
      this.parseError.set(false);
      return;
    }

    const parsed = parseFlexibleTimeInput(text);
    if (!parsed) {
      this.parseError.set(true);
      this.#setInvalidTimeError();
      return;
    }

    this.control().setValue(parsed);
    this.#clearInvalidTimeError();
    this.parseError.set(false);
    this.displayControl.setValue(this.#dates.formatTime(parsed), { emitEvent: false });
  }

  #syncDisplayFromControl(value: string): void {
    if (!value) {
      this.displayControl.setValue('', { emitEvent: false });
      return;
    }
    this.displayControl.setValue(this.#dates.formatTime(value), { emitEvent: false });
    this.parseError.set(false);
  }

  #syncDisabledState(): void {
    if (this.isDisabled()) {
      this.displayControl.disable({ emitEvent: false });
      return;
    }
    this.displayControl.enable({ emitEvent: false });
  }

  #setInvalidTimeError(): void {
    const control = this.control();
    control.setErrors({ ...control.errors, invalidTime: true });
  }

  #clearInvalidTimeError(): void {
    const control = this.control();
    const errors = control.errors;
    if (!errors?.['invalidTime']) {
      return;
    }
    const { invalidTime: _removed, ...rest } = errors;
    control.setErrors(Object.keys(rest).length > 0 ? rest : null);
  }
}
