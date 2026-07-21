import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageSwitcher } from '@components/layout/language-switcher/language-switcher';

/** Nome oficial alinhado à tela de consentimento OAuth (não traduzir). */
const OAUTH_APP_NAME = 'AIC — Administração de Igrejas Cristãs';

@Component({
  selector: 'app-public-home',
  imports: [RouterLink, TranslatePipe, LanguageSwitcher],
  templateUrl: './public-home.html',
  styleUrl: './public-home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicHome implements OnInit {
  readonly #title = inject(Title);

  ngOnInit(): void {
    this.#title.setTitle(OAUTH_APP_NAME);
  }
}
