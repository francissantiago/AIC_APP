import { Pipe, PipeTransform, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { AppVersionService } from '@services/app-version-service';
import { translateServiceStub } from '../../../testing/translate-testing';
import { AppUpdateBanner } from './app-update-banner';

@Pipe({ name: 'translate' })
class TranslatePipeStub implements PipeTransform {
  transform(key: string): string {
    return key;
  }
}

describe('AppUpdateBanner', () => {
  let fixture: ComponentFixture<AppUpdateBanner>;
  let updateAvailableSignal: ReturnType<typeof signal<boolean>>;
  let reloadSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    updateAvailableSignal = signal(false);
    reloadSpy = vi.fn();

    await TestBed.configureTestingModule({
      imports: [AppUpdateBanner],
      providers: [
        {
          provide: AppVersionService,
          useValue: {
            updateAvailable: updateAvailableSignal.asReadonly(),
            reloadApplication: reloadSpy,
          },
        },
        { provide: TranslateService, useValue: translateServiceStub() },
      ],
    })
      .overrideComponent(AppUpdateBanner, {
        set: { imports: [TranslatePipeStub] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AppUpdateBanner);
    fixture.detectChanges();
  });

  it('não renderiza quando updateAvailable é false', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="app-update-banner"]')).toBeNull();
  });

  it('renderiza botões quando updateAvailable é true', () => {
    updateAvailableSignal.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="app-update-banner"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="app-update-reload"]')).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-testid="app-update-dismiss"]'),
    ).not.toBeNull();
  });

  it('reload chama reloadApplication', () => {
    updateAvailableSignal.set(true);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-testid="app-update-reload"]').click();

    expect(reloadSpy).toHaveBeenCalled();
  });
});
