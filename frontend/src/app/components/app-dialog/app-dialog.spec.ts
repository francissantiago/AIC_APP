import { Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppDialog } from './app-dialog';

@Pipe({ name: 'translate' })
class TranslatePipeStub implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

describe('AppDialog', () => {
  let component: AppDialog;
  let fixture: ComponentFixture<AppDialog>;

  beforeEach(async () => {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [AppDialog],
    })
      .overrideComponent(AppDialog, {
        set: { imports: [TranslatePipeStub] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AppDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open and close the native dialog via open model', () => {
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.open).toBe(false);

    component.open.set(true);
    fixture.detectChanges();
    expect(dialog.open).toBe(true);

    component.requestClose();
    fixture.detectChanges();
    expect(component.open()).toBe(false);
    expect(dialog.open).toBe(false);
  });

  it('should emit closed when requestClose is called', () => {
    const closedSpy = vi.fn();
    component.closed.subscribe(closedSpy);
    component.open.set(true);
    fixture.detectChanges();

    component.requestClose();
    expect(closedSpy).toHaveBeenCalledTimes(1);
  });
});
