import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LegalPageLayout } from '@components/legal/legal-page-layout/legal-page-layout';

@Component({
  selector: 'app-privacy-policy',
  imports: [TranslatePipe, LegalPageLayout],
  templateUrl: './privacy-policy.html',
  styleUrl: './privacy-policy.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPolicy {}
