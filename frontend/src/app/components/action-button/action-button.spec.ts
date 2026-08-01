import { Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActionButtonVariant } from '@enums/action-button-variant';
import { ActionButton } from './action-button';

@Pipe({ name: 'translate' })
class TranslatePipeStub implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

describe('ActionButton', () => {
  let fixture: ComponentFixture<ActionButton>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ActionButton],
    })
      .overrideComponent(ActionButton, {
        set: { imports: [TranslatePipeStub] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ActionButton);
    fixture.componentRef.setInput('variant', ActionButtonVariant.EDIT);
    fixture.componentRef.setInput('labelKey', 'COMMON.EDIT');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should emit action on click', () => {
    const actionSpy = vi.fn();
    fixture.componentInstance.action.subscribe(actionSpy);

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();

    expect(actionSpy).toHaveBeenCalledTimes(1);
  });

  it('should not emit action when disabled', () => {
    const actionSpy = vi.fn();
    fixture.componentInstance.action.subscribe(actionSpy);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();

    expect(actionSpy).not.toHaveBeenCalled();
  });

  it('should expose aria-label from labelKey', () => {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('COMMON.EDIT');
  });

  it('should apply data-testid when provided', () => {
    fixture.componentRef.setInput('testId', 'family-edit-1');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('data-testid')).toBe('family-edit-1');
  });

  it('should render tooltip in icon-only mode', () => {
    const tooltip = fixture.nativeElement.querySelector('.action-button__tooltip') as HTMLElement;
    expect(tooltip).toBeTruthy();
    expect(tooltip.textContent?.trim()).toBe('COMMON.EDIT');
  });

  it('should render label text in icon-label mode', () => {
    fixture.componentRef.setInput('appearance', 'icon-label');
    fixture.detectChanges();

    const label = fixture.nativeElement.querySelector('.font-medium') as HTMLElement;
    expect(label).toBeTruthy();
    expect(label.textContent?.trim()).toBe('COMMON.EDIT');
    expect(fixture.nativeElement.querySelector('.action-button__tooltip')).toBeNull();
  });
});
