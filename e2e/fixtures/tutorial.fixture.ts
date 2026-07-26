import type { Page } from '@playwright/test';

import { test as authTest, expect } from './authenticated.fixture';

const introPauseMs = Number(process.env.E2E_TUTORIAL_INTRO_PAUSE_MS ?? '1000');
const stepPauseMs = Number(process.env.E2E_TUTORIAL_PAUSE_MS ?? '800');

type TutorialStepFn = (label: string, fn: () => Promise<void>) => Promise<void>;

type TutorialFixtures = {
  tutorialStep: TutorialStepFn;
};

export const test = authTest.extend<TutorialFixtures>({
  page: async ({ page }, use) => {
    await page.waitForTimeout(introPauseMs);
    await use(page);
  },

  tutorialStep: async ({ page }, use) => {
    const tutorialStep: TutorialStepFn = async (label, fn) => {
      await test.step(label, async () => {
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
