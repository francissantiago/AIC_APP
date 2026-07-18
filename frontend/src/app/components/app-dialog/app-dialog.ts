import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-dialog',
  imports: [TranslatePipe],
  templateUrl: './app-dialog.html',
  styleUrl: './app-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppDialog {
  readonly open = model(false);
  readonly title = input('');
  readonly closed = output<void>();

  readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialogEl');
  readonly titleId = `app-dialog-title-${Math.random().toString(36).slice(2, 10)}`;

  #triggerElement: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const dialog = this.dialogRef()?.nativeElement;
      const isOpen = this.open();
      if (!dialog) {
        return;
      }

      if (isOpen && !dialog.open) {
        const active = document.activeElement;
        this.#triggerElement = active instanceof HTMLElement ? active : null;
        dialog.showModal();
      } else if (!isOpen && dialog.open) {
        dialog.close();
      }
    });
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialogRef()?.nativeElement) {
      this.requestClose();
    }
  }

  onCancel(event: Event): void {
    event.preventDefault();
    this.requestClose();
  }

  onNativeClose(): void {
    if (this.open()) {
      this.open.set(false);
      this.closed.emit();
    }
    this.#restoreFocus();
  }

  requestClose(): void {
    if (!this.open()) {
      return;
    }
    this.open.set(false);
    this.closed.emit();
  }

  #restoreFocus(): void {
    const trigger = this.#triggerElement;
    this.#triggerElement = null;
    queueMicrotask(() => trigger?.focus());
  }
}
