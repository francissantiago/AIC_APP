import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { MemberMaritalStatus } from '@enums/member-marital-status';
import { IMembershipCard } from '@interfaces/IMembershipCard';
import { MembersService } from '@services/members-service';
import { MembershipCardsService } from '@services/membership-cards-service';

@Component({
  selector: 'app-membership-card-preview',
  imports: [TranslatePipe],
  templateUrl: './membership-card-preview.html',
  styleUrl: './membership-card-preview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembershipCardPreview implements OnDestroy {
  readonly #membersService = inject(MembersService);
  readonly #membershipCardsService = inject(MembershipCardsService);
  readonly #destroyRef = inject(DestroyRef);

  readonly card = input.required<IMembershipCard>();
  readonly side = input<'front' | 'back'>('front');
  readonly compact = input(false);

  readonly photoObjectUrl = signal<string | null>(null);
  readonly logoObjectUrl = signal<string | null>(null);
  readonly signatureObjectUrl = signal<string | null>(null);

  readonly showFront = computed(() => this.side() === 'front');

  constructor() {
    effect(() => {
      const current = this.card();
      this.#loadAssets(current);
    });
    this.#destroyRef.onDestroy(() => this.#revokeAll());
  }

  ngOnDestroy(): void {
    this.#revokeAll();
  }

  maritalLabelKey(status: MemberMaritalStatus): string {
    return `MEMBERS.MARITAL_${status.toUpperCase()}`;
  }

  formatDate(value: string | null): string {
    if (!value) {
      return '';
    }
    const [y, m, d] = value.split('-');
    if (!y || !m || !d) {
      return value;
    }
    return `${d}/${m}/${y}`;
  }

  #loadAssets(card: IMembershipCard): void {
    this.#revokeAll();
    this.photoObjectUrl.set(null);
    this.logoObjectUrl.set(null);
    this.signatureObjectUrl.set(null);

    if (card.front.photoUrl) {
      this.#membersService
        .getPhotoBlob(card.memberId)
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe({
          next: (blob) => this.photoObjectUrl.set(URL.createObjectURL(blob)),
        });
    }
    if (card.institution.logoUrl) {
      this.#membershipCardsService
        .getLogoBlob()
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe({
          next: (blob) => this.logoObjectUrl.set(URL.createObjectURL(blob)),
        });
    }
    if (card.institution.signatureUrl) {
      this.#membershipCardsService
        .getSignatureBlob()
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe({
          next: (blob) => this.signatureObjectUrl.set(URL.createObjectURL(blob)),
        });
    }
  }

  #revokeAll(): void {
    for (const url of [this.photoObjectUrl(), this.logoObjectUrl(), this.signatureObjectUrl()]) {
      if (url) {
        URL.revokeObjectURL(url);
      }
    }
  }
}
