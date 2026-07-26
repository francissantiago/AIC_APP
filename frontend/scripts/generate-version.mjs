import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(__dirname, '..');
const packageJsonPath = join(frontendRoot, 'package.json');

const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

const raw = readFileSync(packageJsonPath, 'utf-8');
const packageJson = JSON.parse(raw);

if (!packageJson.version || !semverPattern.test(packageJson.version)) {
  console.error('frontend/package.json must define a valid semver "version" field.');
  process.exit(1);
}

const builtAt = new Date().toISOString();
const versionPayload = {
  version: packageJson.version,
  builtAt,
};

writeFileSync(
  join(frontendRoot, 'public', 'version.json'),
  `${JSON.stringify(versionPayload, null, 2)}\n`,
  'utf-8',
);

writeFileSync(
  join(frontendRoot, 'src', 'environments', 'version.generated.ts'),
  `/** Gerado por scripts/generate-version.mjs — não editar manualmente */
export const APP_VERSION = '${packageJson.version}';
export const APP_BUILT_AT = '${builtAt}';
`,
  'utf-8',
);

console.log(`Generated app version ${packageJson.version} (${builtAt})`);
