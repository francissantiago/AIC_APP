import { createDemoCleanupState, cleanupDemoState, type DemoCleanupState } from './demo-cleanup.helper';

export function createTutorialCleanupState(): DemoCleanupState {
  return createDemoCleanupState();
}

export async function cleanupTutorialState(state: DemoCleanupState): Promise<void> {
  await cleanupDemoState(state);
}
