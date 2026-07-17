import { toCamelCase, toKebabCase, toPascalCase } from '../utils.js';
import type { BlueprintFile } from './frontend-component.js';

export function buildFrontendServiceBlueprint(
  name: string,
  resourcePath?: string,
): {
  files: BlueprintFile[];
  notes: string[];
} {
  const kebab = toKebabCase(name);
  const pascal = toPascalCase(name);
  const camel = toCamelCase(name);
  const interfaceName = `I${pascal}`;
  const patchInterfaceName = `I${pascal}Patch`;
  const serviceClass = `${pascal}Service`;
  const serviceFile = `${kebab}-service`;
  const apiSegment = resourcePath?.replace(/^\/+|\/+$/g, '') || kebab;

  const iface = `export interface ${interfaceName} {
  id?: number;
  // TODO: tipar campos do recurso
}
`;

  const ifacePatch = `export interface ${patchInterfaceName} {
  // TODO: campos parciais opcionais
}
`;

  const service = `import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from 'environments/environment.development';
import { Observable, retry, timer } from 'rxjs';
import { ${interfaceName} } from '@interfaces/${interfaceName}';
import { ${patchInterfaceName} } from '@interfaces/${patchInterfaceName}';

@Injectable({
  providedIn: 'root',
})
export class ${serviceClass} {
  #http = inject(HttpClient);
  #apiUrl = \`\${environment.apiUrl}/${apiSegment}\`;
  #retryCount = 3;
  #retryDelay = 1000;

  #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  getById(id: number): Observable<${interfaceName}> {
    return this.#http
      .get<${interfaceName}>(\`\${this.#apiUrl}/\${id}\`, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  create(body: ${interfaceName}): Observable<${interfaceName}> {
    return this.#http
      .post<${interfaceName}>(this.#apiUrl, body, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  update(id: number, body: ${interfaceName}): Observable<${interfaceName}> {
    return this.#http
      .put<${interfaceName}>(\`\${this.#apiUrl}/\${id}\`, body, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  patch(id: number, body: ${patchInterfaceName}): Observable<${interfaceName}> {
    return this.#http
      .patch<${interfaceName}>(\`\${this.#apiUrl}/\${id}\`, body, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  remove(id: number): Observable<Record<string, never>> {
    return this.#http
      .delete<Record<string, never>>(\`\${this.#apiUrl}/\${id}\`, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  #withRetry<T>() {
    return retry<T>({
      count: this.#retryCount,
      delay: (error: HttpErrorResponse, retryCount: number) => {
        if (error.status < 500) {
          throw error;
        }

        console.warn(
          \`Error \${error.status} on attempt \${retryCount} of \${this.#retryCount}. Trying again in \${this.#retryDelay}ms...\`,
        );
        return timer(this.#retryDelay);
      },
    });
  }
}
`;

  return {
    files: [
      {
        path: `frontend/src/app/interfaces/${interfaceName}.ts`,
        content: iface,
      },
      {
        path: `frontend/src/app/interfaces/${patchInterfaceName}.ts`,
        content: ifacePatch,
      },
      {
        path: `frontend/src/app/services/${serviceFile}.ts`,
        content: service,
      },
    ],
    notes: [
      'Padrão baseado em frontend/src/app/services/example-service.ts',
      'providedIn: "root" + inject(HttpClient)',
      'Retry apenas para status >= 500',
      'Usar aliases @interfaces/* e environments',
      `Classe sugerida: ${serviceClass} (variável típica: #${camel}Service)`,
      'Ajustar environment.apiUrl conforme o backend Nest (prefixo /api)',
    ],
  };
}
