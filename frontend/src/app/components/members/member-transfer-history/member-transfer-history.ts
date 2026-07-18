import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  OnChanges,
  output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { MemberTransferStatus } from '@enums/member-transfer-status';
import { IMemberTransfer } from '@interfaces/IMemberTransfer';
import { ApiErrorService } from '@services/api-error.service';
import { MemberTransfersService } from '@services/member-transfers-service';
import { SecretariatService } from '@services/secretariat-service';

@Component({
  selector: 'app-member-transfer-history',
  imports: [TranslatePipe],
  templateUrl: './member-transfer-history.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberTransferHistory implements OnChanges {
  readonly #transfersService = inject(MemberTransfersService);
  readonly #secretariatService = inject(SecretariatService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly memberId = input.required<string>();
  readonly canWrite = input(false);
  readonly canReadSecretariat = input(false);
  readonly reloadToken = input(0);

  readonly changed = output<void>();

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly feedbackKey = signal<string | null>(null);
  readonly transfers = signal<IMemberTransfer[]>([]);
  readonly pendingCompleteId = signal<string | null>(null);
  readonly pendingCancelId = signal<string | null>(null);
  readonly actionLoading = signal(false);

  readonly MemberTransferStatus = MemberTransferStatus;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['memberId'] || changes['reloadToken']) {
      this.#load();
    }
  }

  statusLabelKey(status: MemberTransferStatus): string {
    return `MEMBER_TRANSFERS.STATUS_${status.toUpperCase()}`;
  }

  formatDate(iso: string | null): string {
    if (!iso) {
      return '—';
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toLocaleString();
  }

  askComplete(id: string): void {
    this.pendingCompleteId.set(id);
    this.pendingCancelId.set(null);
  }

  askCancel(id: string): void {
    this.pendingCancelId.set(id);
    this.pendingCompleteId.set(null);
  }

  clearPendingActions(): void {
    this.pendingCompleteId.set(null);
    this.pendingCancelId.set(null);
  }

  confirmComplete(): void {
    const memberId = this.memberId();
    const id = this.pendingCompleteId();
    if (!memberId || !id || !this.canWrite()) {
      return;
    }

    this.actionLoading.set(true);
    this.errorMessage.set(null);

    this.#transfersService
      .complete(memberId, id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.actionLoading.set(false);
          this.clearPendingActions();
          this.feedbackKey.set('MEMBER_TRANSFERS.COMPLETE_SUCCESS');
          this.#load();
          this.changed.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.actionLoading.set(false);
          this.errorMessage.set(this.#apiError.resolve(error).displayMessage);
        },
      });
  }

  confirmCancel(): void {
    const memberId = this.memberId();
    const id = this.pendingCancelId();
    if (!memberId || !id || !this.canWrite()) {
      return;
    }

    this.actionLoading.set(true);
    this.errorMessage.set(null);

    this.#transfersService
      .cancel(memberId, id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.actionLoading.set(false);
          this.clearPendingActions();
          this.feedbackKey.set('MEMBER_TRANSFERS.CANCEL_SUCCESS');
          this.#load();
          this.changed.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.actionLoading.set(false);
          this.errorMessage.set(this.#apiError.resolve(error).displayMessage);
        },
      });
  }

  downloadDocument(documentId: string): void {
    if (!this.canReadSecretariat()) {
      return;
    }

    this.#secretariatService
      .downloadDocumentFile(documentId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = 'recommendation-letter.pdf';
          anchor.click();
          URL.revokeObjectURL(url);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.#apiError.resolve(error).displayMessage);
        },
      });
  }

  #load(): void {
    const memberId = this.memberId();
    if (!memberId) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.#transfersService
      .list(memberId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (items) => {
          this.transfers.set(items);
          this.loading.set(false);
        },
        error: () => {
          this.transfers.set([]);
          this.loading.set(false);
          this.errorMessage.set(null);
          this.feedbackKey.set('MEMBER_TRANSFERS.LOAD_ERROR');
        },
      });
  }
}
