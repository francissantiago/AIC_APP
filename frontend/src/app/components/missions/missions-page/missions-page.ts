import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-missions-page',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslatePipe],
  templateUrl: './missions-page.html',
  styleUrl: './missions-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionsPage {}
