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
import type { IHelpVideo } from '@interfaces/IHelpVideo';

@Component({
  selector: 'app-help-video-dialog',
  imports: [TranslatePipe],
  templateUrl: './help-video-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpVideoDialog {
  readonly open = model(false);
  readonly video = input<IHelpVideo | null>(null);
  readonly closed = output<void>();

  readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialogEl');
  readonly videoRef = viewChild<ElementRef<HTMLVideoElement>>('videoEl');
  readonly titleId = `help-video-dialog-title-${Math.random().toString(36).slice(2, 10)}`;

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
        this.#syncVideoSource(true);
        return;
      }

      if (!isOpen && dialog.open) {
        dialog.close();
      }
    });

    effect(() => {
      const isOpen = this.open();
      const current = this.video();
      if (!isOpen || !current) {
        return;
      }
      this.#syncVideoSource(false);
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
    this.#pauseVideo();
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

  #syncVideoSource(autoplay: boolean): void {
    const element = this.videoRef()?.nativeElement;
    const current = this.video();
    if (!element || !current) {
      return;
    }

    if (element.getAttribute('src') !== current.path) {
      element.setAttribute('src', current.path);
      element.load();
    }

    if (autoplay) {
      void element.play().catch(() => undefined);
    }
  }

  #pauseVideo(): void {
    const element = this.videoRef()?.nativeElement;
    if (!element) {
      return;
    }
    element.pause();
    element.removeAttribute('src');
    element.load();
  }

  #restoreFocus(): void {
    const trigger = this.#triggerElement;
    this.#triggerElement = null;
    queueMicrotask(() => trigger?.focus());
  }
}
