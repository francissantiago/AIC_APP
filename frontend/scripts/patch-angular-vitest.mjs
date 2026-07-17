/**
 * Workaround for Vitest 4 + @angular/build unit-test on this environment:
 * 1) init-testbed setupFiles call beforeEach/afterEach before the runner exists.
 * 2) isolate:false shares a broken TestBed across files.
 *
 * Specs call TestBed.resetTestingModule() in their own beforeEach hooks.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const buildOptionsPath = join(
  root,
  'node_modules/@angular/build/src/builders/unit-test/runners/vitest/build-options.js',
);
const pluginsPath = join(
  root,
  'node_modules/@angular/build/src/builders/unit-test/runners/vitest/plugins.js',
);

const hooksMarker = 'AIC_PATCH: setupFiles run without Vitest runner';
let buildOptions = readFileSync(buildOptionsPath, 'utf8');

if (!buildOptions.includes(hooksMarker)) {
  const from = `beforeEach(getCleanupHook(false));
    afterEach(getCleanupHook(true));`;
  const to = `// ${hooksMarker}
    try {
      beforeEach(getCleanupHook(false));
      afterEach(getCleanupHook(true));
    } catch {
      // Specs call TestBed.resetTestingModule() in their own beforeEach.
    }`;

  if (buildOptions.includes(from)) {
    buildOptions = buildOptions.replace(from, to);
    writeFileSync(buildOptionsPath, buildOptions);
    console.log('[patch-angular-vitest] hooks guard applied');
  } else {
    console.warn('[patch-angular-vitest] hooks pattern not found; skip');
  }
} else {
  console.log('[patch-angular-vitest] hooks guard already applied');
}

let plugins = readFileSync(pluginsPath, 'utf8');
if (!plugins.includes('AIC_PATCH_ISOLATE') && plugins.includes('isolate: false,')) {
  plugins = plugins.replace('isolate: false,', 'isolate: true, // AIC_PATCH_ISOLATE');
  writeFileSync(pluginsPath, plugins);
  console.log('[patch-angular-vitest] isolate=true applied');
} else if (plugins.includes('AIC_PATCH_ISOLATE')) {
  console.log('[patch-angular-vitest] isolate=true already applied');
}
