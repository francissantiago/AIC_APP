import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LegalPageLayout } from '@components/legal/legal-page-layout/legal-page-layout';

@Component({
  selector: 'app-terms-of-service',
  imports: [TranslatePipe, LegalPageLayout],
  templateUrl: './terms-of-service.html',
  styleUrl: './terms-of-service.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsOfService {}
