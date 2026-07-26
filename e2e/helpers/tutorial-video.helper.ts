import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import path from 'path';

export interface CatalogFeature {
  id: string;
  videoFile: string;
  i18nTitleKey: string;
  status: string;
  testFile?: string;
}

export interface CatalogFile {
  version: string;
  features: CatalogFeature[];
}

export interface HelpVideoManifestEntry {
  featureId: string;
  path: string;
  titleKey: string;
  recordedAt: string;
  durationMs: number | null;
}

export interface HelpVideoManifest {
  version: string;
  locale: string;
  videos: HelpVideoManifestEntry[];
}

interface PlaywrightAttachment {
  name: string;
  path?: string;
}

interface PlaywrightTestResult {
  attachments?: PlaywrightAttachment[];
}

interface PlaywrightTest {
  results?: PlaywrightTestResult[];
}

interface PlaywrightSpec {
  file?: string;
  tests?: PlaywrightTest[];
}

interface PlaywrightSuite {
  file?: string;
  specs?: PlaywrightSpec[];
  suites?: PlaywrightSuite[];
}

interface PlaywrightJsonReport {
  suites: PlaywrightSuite[];
}

export function loadCatalog(catalogPath: string): CatalogFile {
  return JSON.parse(readFileSync(catalogPath, 'utf-8')) as CatalogFile;
}

export function featureIdFromSpecPath(specPath: string): string {
  const base = path.basename(specPath);
  return base.replace('.tutorial.spec.ts', '');
}

export function findVideoArtifacts(artifactsDir: string): string[] {
  if (!existsSync(artifactsDir)) {
    return [];
  }

  const videos: string[] = [];

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (entry === 'video.webm') {
        videos.push(fullPath);
      }
    }
  };

  walk(artifactsDir);
  return videos;
}

export function resolveFeatureIdFromArtifactPath(
  artifactPath: string,
  features: CatalogFeature[],
): string | null {
  const normalized = artifactPath.toLowerCase().replace(/\\/g, '/');

  const sorted = [...features].sort((a, b) => b.id.length - a.id.length);
  for (const feature of sorted) {
    if (normalized.includes(feature.id)) {
      return feature.id;
    }
    const slug = feature.id.replace(/-/g, '');
    if (normalized.includes(slug.slice(0, Math.min(slug.length, 20)))) {
      return feature.id;
    }
  }

  const folder = path.basename(path.dirname(normalized));
  for (const feature of sorted) {
    const folderPrefix = feature.id.replace(/-/g, '').slice(0, 12);
    if (folder.replace(/-/g, '').includes(folderPrefix.slice(0, 8))) {
      return feature.id;
    }
  }

  return null;
}

export function collectVideosFromReport(reportPath: string): Array<{ featureId: string; videoPath: string }> {
  if (!existsSync(reportPath)) {
    return [];
  }

  const report = JSON.parse(readFileSync(reportPath, 'utf-8')) as PlaywrightJsonReport;
  const entries: Array<{ featureId: string; videoPath: string }> = [];
  const seen = new Set<string>();

  const walkSuite = (suite: PlaywrightSuite): void => {
    for (const spec of suite.specs ?? []) {
      const specFile = spec.file ?? suite.file;
      if (!specFile?.includes('.tutorial.spec.ts')) {
        continue;
      }

      const featureId = featureIdFromSpecPath(specFile);
      for (const test of spec.tests ?? []) {
        for (const result of test.results ?? []) {
          for (const attachment of result.attachments ?? []) {
            if (attachment.name !== 'video' || !attachment.path || seen.has(featureId)) {
              continue;
            }
            seen.add(featureId);
            entries.push({ featureId, videoPath: attachment.path });
          }
        }
      }
    }

    for (const child of suite.suites ?? []) {
      walkSuite(child);
    }
  };

  for (const suite of report.suites) {
    walkSuite(suite);
  }

  return entries;
}

export function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

export function publishTutorialVideos(options: {
  catalogPath: string;
  artifactsDir: string;
  resultsPath?: string;
  outputDir: string;
  frontendDir?: string;
  locale?: string;
}): HelpVideoManifest {
  const catalog = loadCatalog(options.catalogPath);
  const implemented = catalog.features.filter((feature) => feature.status === 'implemented');

  ensureDir(options.outputDir);

  const fromReport = options.resultsPath ? collectVideosFromReport(options.resultsPath) : [];
  const artifactVideos = findVideoArtifacts(options.artifactsDir);

  const manifestVideos: HelpVideoManifestEntry[] = [];
  const recordedAt = new Date().toISOString();
  const published = new Set<string>();

  for (const entry of fromReport) {
    const feature = implemented.find((item) => item.id === entry.featureId);
    if (!feature || published.has(entry.featureId) || !existsSync(entry.videoPath)) {
      continue;
    }

    const destination = path.join(options.outputDir, feature.videoFile);
    copyFileSync(entry.videoPath, destination);
    published.add(entry.featureId);
    manifestVideos.push({
      featureId: feature.id,
      path: `/help-videos/${feature.videoFile}`,
      titleKey: feature.i18nTitleKey,
      recordedAt,
      durationMs: null,
    });
  }

  for (const videoPath of artifactVideos) {
    const featureId = resolveFeatureIdFromArtifactPath(videoPath, implemented);
    if (!featureId || published.has(featureId)) {
      continue;
    }

    const feature = implemented.find((item) => item.id === featureId);
    if (!feature) {
      continue;
    }

    const destination = path.join(options.outputDir, feature.videoFile);
    copyFileSync(videoPath, destination);
    published.add(featureId);
    manifestVideos.push({
      featureId: feature.id,
      path: `/help-videos/${feature.videoFile}`,
      titleKey: feature.i18nTitleKey,
      recordedAt,
      durationMs: null,
    });
  }

  const manifest: HelpVideoManifest = {
    version: catalog.version,
    locale: options.locale ?? 'pt-BR',
    videos: manifestVideos.sort((a, b) => a.featureId.localeCompare(b.featureId)),
  };

  const manifestPath = path.join(options.outputDir, 'help-videos.manifest.json');
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8');

  if (options.frontendDir) {
    ensureDir(options.frontendDir);
    for (const entry of manifestVideos) {
      const source = path.join(options.outputDir, `${entry.featureId}.webm`);
      if (existsSync(source)) {
        copyFileSync(source, path.join(options.frontendDir, `${entry.featureId}.webm`));
      }
    }
    copyFileSync(manifestPath, path.join(options.frontendDir, 'help-videos.manifest.json'));
  }

  return manifest;
}
