import { paths } from '../config.js';
import {
  toCamelCase,
  toConstCase,
  toKebabCase,
  toPascalCase,
} from '../utils.js';

export interface BlueprintFile {
  path: string;
  content: string;
}

export function buildFrontendComponentBlueprint(name: string): {
  files: BlueprintFile[];
  i18nKeys: Record<string, string>;
  notes: string[];
} {
  const kebab = toKebabCase(name);
  const pascal = toPascalCase(name);
  const i18nPrefix = toConstCase(name);
  const baseDir = `frontend/src/app/components/${kebab}`;

  const ts = `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-${kebab}',
  imports: [TranslatePipe],
  templateUrl: './${kebab}.html',
  styleUrl: './${kebab}.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ${pascal} {}
`;

  const html = `<section class="${kebab}">
  <h1>{{ '${i18nPrefix}.TITLE' | translate }}</h1>
  <p>{{ '${i18nPrefix}.DESCRIPTION' | translate }}</p>
</section>
`;

  const scss = `:host {
  display: block;
}

.${kebab} {
  padding: 1rem;
}
`;

  const spec = `import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ${pascal} } from './${kebab}';

describe('${pascal}', () => {
  let component: ${pascal};
  let fixture: ComponentFixture<${pascal}>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [${pascal}],
    }).compileComponents();

    fixture = TestBed.createComponent(${pascal});
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
`;

  return {
    files: [
      { path: `${baseDir}/${kebab}.ts`, content: ts },
      { path: `${baseDir}/${kebab}.html`, content: html },
      { path: `${baseDir}/${kebab}.scss`, content: scss },
      { path: `${baseDir}/${kebab}.spec.ts`, content: spec },
    ],
    i18nKeys: {
      [`${i18nPrefix}.TITLE`]: pascal,
      [`${i18nPrefix}.DESCRIPTION`]: `${pascal} component`,
    },
    notes: [
      'Padrão baseado em frontend/src/app/components/example/',
      'ChangeDetectionStrategy.OnPush obrigatório',
      'NÃO definir standalone: true (default no Angular 20+)',
      'Usar TranslatePipe para textos de UI',
      'Paths de template/style relativos ao arquivo .ts',
      `Adicionar chaves i18n em public/i18n/{en,es,pt-BR}.json sob "${i18nPrefix}"`,
      `Registrar rota lazy/eager em app.routes.ts se necessário`,
      `Referência canônica de pasta: ${paths.frontendComponents}`,
    ],
  };
}
