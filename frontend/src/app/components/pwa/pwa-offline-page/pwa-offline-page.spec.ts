import { Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { translateServiceStub } from '../../../testing/translate-testing';
import { PwaOfflinePage } from './pwa-offline-page';

@Pipe({ name: 'translate' })
class TranslatePipeStub implements PipeTransform {
  transform(key: string): string {
    return key;
  }
}

describe('PwaOfflinePage', () => {
  let fixture: ComponentFixture<PwaOfflinePage>;

  beforeEach(async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [PwaOfflinePage],
      providers: [{ provide: TranslateService, useValue: translateServiceStub() }],
    })
      .overrideComponent(PwaOfflinePage, {
        set: { imports: [TranslatePipeStub] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(PwaOfflinePage);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renderiza título e CTA de retry', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="pwa-offline-page"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="pwa-offline-retry"]')).not.toBeNull();
  });

  it('retry chama location.reload', () => {
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: reloadSpy },
    });

    fixture.nativeElement.querySelector('[data-testid="pwa-offline-retry"]').click();

    expect(reloadSpy).toHaveBeenCalled();
  });
});
