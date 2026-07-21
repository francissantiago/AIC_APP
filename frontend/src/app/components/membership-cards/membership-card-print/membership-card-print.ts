import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IMembershipCard } from '@interfaces/IMembershipCard';
import { MembershipCardPreview } from '../membership-card-preview/membership-card-preview';

@Component({
  selector: 'app-membership-card-print',
  imports: [MembershipCardPreview],
  templateUrl: './membership-card-print.html',
  styleUrl: './membership-card-print.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembershipCardPrint {
  readonly cards = input.required<IMembershipCard[]>();
}
