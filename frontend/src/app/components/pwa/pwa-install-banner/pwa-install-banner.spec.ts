import { Pipe, PipeTransform, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { PwaInstallService } from '@services/pwa-install-service';
import { translateServiceStub } from '../../../testing/translate-testing';
import { PwaInstallBanner } from './pwa-install-banner';

@Pipe({ name: 'translate' })
class TranslatePipeStub implements PipeTransform {
  transform(key: string): string {
    return key;
  }
}

describe('PwaInstallBanner', () => {
  let fixture: ComponentFixture<PwaInstallBanner>;
  let canInstallSignal: ReturnType<typeof signal<boolean>>;
  let dismissedSignal: ReturnType<typeof signal<boolean>>;
  let promptSpy: ReturnType<typeof vi.fn>;
  let dismissSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    canInstallSignal = signal(false);
    dismissedSignal = signal(false);
    promptSpy = vi.fn();
    dismissSpy = vi.fn();

    await TestBed.configureTestingModule({
      imports: [PwaInstallBanner],
      providers: [
        {
          provide: PwaInstallService,
          useValue: {
            canInstall: canInstallSignal.asReadonly(),
            dismissed: dismissedSignal.asReadonly(),
            promptInstall: promptSpy,
            dismiss: dismissSpy,
          },
        },
        { provide: TranslateService, useValue: translateServiceStub() },
      ],
    })
      .overrideComponent(PwaInstallBanner, {
        set: { imports: [TranslatePipeStub] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(PwaInstallBanner);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('não renderiza quando canInstall é false', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="pwa-install-banner"]')).toBeNull();
  });

  it('renderiza quando canInstall é true e não dismissed', () => {
    canInstallSignal.set(true);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="pwa-install-banner"]'),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="pwa-install-cta"]')).not.toBeNull();
  });

  it('oculta quando dismissed', () => {
    canInstallSignal.set(true);
    dismissedSignal.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="pwa-install-banner"]')).toBeNull();
  });

  it('CTA chama promptInstall', () => {
    canInstallSignal.set(true);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-testid="pwa-install-cta"]').click();

    expect(promptSpy).toHaveBeenCalled();
  });
});
