import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-social-projects-page',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslatePipe],
  templateUrl: './social-projects-page.html',
  styleUrl: './social-projects-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialProjectsPage {}
