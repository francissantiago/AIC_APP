import type { Page } from '@playwright/test';

import { prepareTutorialPage } from '../helpers/tutorial-visual.helper';
import { test as authTest, expect } from './authenticated.fixture';

const introPauseMs = Number(process.env.E2E_TUTORIAL_INTRO_PAUSE_MS ?? '2000');
const preStepPauseMs = Number(process.env.E2E_TUTORIAL_PRE_STEP_PAUSE_MS ?? '1500');
const stepPauseMs = Number(process.env.E2E_TUTORIAL_PAUSE_MS ?? '2800');

type TutorialStepFn = (label: string, fn: () => Promise<void>) => Promise<void>;

type TutorialFixtures = {
  tutorialStep: TutorialStepFn;
};

export const test = authTest.extend<TutorialFixtures>({
  page: async ({ page }, use) => {
    await prepareTutorialPage(page);
    await page.waitForTimeout(introPauseMs);
    await use(page);
  },

  tutorialStep: async ({ page }, use) => {
    const tutorialStep: TutorialStepFn = async (label, fn) => {
      await test.step(label, async () => {
        await page.waitForTimeout(preStepPauseMs);
        await fn();
        await page.waitForTimeout(stepPauseMs);
      });
    };
    await use(tutorialStep);
  },
});

export { expect };

export async function tutorialPause(page: Page): Promise<void> {
  await page.waitForTimeout(stepPauseMs);
}

export async function tutorialIntroPause(page: Page): Promise<void> {
  await page.waitForTimeout(introPauseMs);
}

export { prepareTutorialPage };
