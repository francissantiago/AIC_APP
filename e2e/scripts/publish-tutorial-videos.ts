import path from 'path';

import { publishTutorialVideos } from '../helpers/tutorial-video.helper';

const rootDir = path.resolve(__dirname, '..');
const copyToFrontend = process.argv.includes('--copy-to-frontend');

const manifest = publishTutorialVideos({
  catalogPath: path.join(rootDir, 'catalog/features.json'),
  artifactsDir: path.join(rootDir, 'test-results/artifacts'),
  resultsPath: path.join(rootDir, 'test-results/results.json'),
  outputDir: path.join(rootDir, 'public/help-videos'),
  frontendDir: copyToFrontend
    ? path.resolve(rootDir, '../frontend/public/help-videos')
    : undefined,
  locale: 'pt-BR',
});

console.log(`Publicados ${manifest.videos.length} vídeo(s) tutorial:`);
for (const video of manifest.videos) {
  console.log(`  - ${video.featureId} → ${video.path}`);
}
