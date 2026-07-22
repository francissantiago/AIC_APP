import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IMembershipCardVerify } from '@interfaces/IMembershipCardVerify';
import { MembershipCardsService } from '@services/membership-cards-service';

@Component({
  selector: 'app-membership-card-verify',
  imports: [TranslatePipe, RouterLink],
  templateUrl: './membership-card-verify.html',
  styleUrl: './membership-card-verify.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembershipCardVerify implements OnInit {
  readonly #route = inject(ActivatedRoute);
  readonly #membershipCards = inject(MembershipCardsService);
  readonly #destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly result = signal<IMembershipCardVerify | null>(null);

  ngOnInit(): void {
    const memberId = this.#route.snapshot.paramMap.get('memberId');
    if (!memberId) {
      this.loading.set(false);
      this.error.set(true);
      return;
    }

    this.#membershipCards
      .verifyPublic(memberId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (payload) => {
          this.result.set(payload);
          this.loading.set(false);
        },
        error: (_error: HttpErrorResponse) => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  statusLabelKey(status: string | null): string {
    if (!status) {
      return 'COMMON.NOT_AVAILABLE';
    }
    return `MEMBERS.STATUS_${status.toUpperCase()}`;
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
}
