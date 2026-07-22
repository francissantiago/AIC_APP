import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MemberMaritalStatus } from '@enums/member-marital-status';
import { IMembershipCard } from '@interfaces/IMembershipCard';

@Component({
  selector: 'app-membership-card-preview',
  imports: [TranslatePipe],
  templateUrl: './membership-card-preview.html',
  styleUrl: './membership-card-preview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembershipCardPreview {
  readonly card = input.required<IMembershipCard>();
  readonly side = input<'front' | 'back'>('front');
  readonly compact = input(false);
  /** Data URL da logo (vem do settings — evita GET binário). */
  readonly logoSrc = input<string | null>(null);
  /** Data URL da assinatura (vem do settings — evita GET binário). */
  readonly signatureSrc = input<string | null>(null);

  readonly showFront = computed(() => this.side() === 'front');
  readonly resolvedLogoSrc = computed(() => this.logoSrc());
  readonly resolvedSignatureSrc = computed(() => this.signatureSrc());
  readonly photoSrc = computed(() => this.card().front.photoDataUrl ?? null);
  readonly registrationNumber = computed(
    () => this.card().front.registrationNumber?.trim() || '',
  );
  readonly filiationLines = computed(() => {
    const value = this.card().front.filiation?.trim();
    if (!value) {
      return [];
    }
    return value
      .split(/\n+|\/+/)
      .map((line) => line.trim())
      .filter(Boolean);
  });

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
}
