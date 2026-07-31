import { TestBed } from '@angular/core/testing';
import { IBeforeInstallPromptEvent } from '@interfaces/IBeforeInstallPromptEvent';
import { PwaInstallService } from './pwa-install-service';

function dispatchBeforeInstallPrompt(
  overrides: Partial<Pick<IBeforeInstallPromptEvent, 'prompt' | 'userChoice' | 'platforms'>> = {},
): IBeforeInstallPromptEvent {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as Event &
    IBeforeInstallPromptEvent;

  Object.defineProperties(event, {
    prompt: {
      value: overrides.prompt ?? vi.fn().mockResolvedValue(undefined),
    },
    userChoice: {
      value:
        overrides.userChoice ?? Promise.resolve({ outcome: 'accepted' as const, platform: 'web' }),
    },
    platforms: { value: overrides.platforms ?? ['web'] },
  });

  window.dispatchEvent(event);
  return event;
}

describe('PwaInstallService', () => {
  let service: PwaInstallService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.removeItem('aic.pwa.installDismissed');

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(PwaInstallService);
  });

  afterEach(() => {
    localStorage.removeItem('aic.pwa.installDismissed');
  });

  it('inicia sem canInstall', () => {
    expect(service.canInstall()).toBe(false);
    expect(service.dismissed()).toBe(false);
  });

  it('captura beforeinstallprompt e habilita canInstall', () => {
    dispatchBeforeInstallPrompt();

    expect(service.canInstall()).toBe(true);
  });

  it('dismiss persiste em localStorage', () => {
    service.dismiss();

    expect(service.dismissed()).toBe(true);
    expect(localStorage.getItem('aic.pwa.installDismissed')).toBe('1');
  });

  it('promptInstall chama prompt e limpa deferred', async () => {
    const promptFn = vi.fn().mockResolvedValue(undefined);
    dispatchBeforeInstallPrompt({
      prompt: promptFn,
      userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }),
    });

    const outcome = await service.promptInstall();

    expect(promptFn).toHaveBeenCalled();
    expect(outcome).toBe('dismissed');
    expect(service.canInstall()).toBe(false);
  });
});
