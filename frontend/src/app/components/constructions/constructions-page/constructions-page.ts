import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-constructions-page',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslatePipe],
  templateUrl: './constructions-page.html',
  styleUrl: './constructions-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConstructionsPage {}
