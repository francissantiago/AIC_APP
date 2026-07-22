import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { of } from 'rxjs';
import { MembersService } from '@services/members-service';
import { MemberFiliationAutocomplete } from './member-filiation-autocomplete';

describe('MemberFiliationAutocomplete', () => {
  let component: MemberFiliationAutocomplete;
  let fixture: ComponentFixture<MemberFiliationAutocomplete>;
  const membersService = {
    options: vi.fn().mockReturnValue(of([])),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberFiliationAutocomplete],
      providers: [{ provide: MembersService, useValue: membersService }],
    })
      .overrideComponent(MemberFiliationAutocomplete, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(MemberFiliationAutocomplete);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('labelKey', 'MEMBERS.FATHER_NAME');
    fixture.componentRef.setInput('nameControl', new FormControl('', { nonNullable: true }));
    fixture.componentRef.setInput('inputId', 'father-name');
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('não busca com menos de 3 caracteres', async () => {
    membersService.options.mockClear();
    const control = component.nameControl();
    control.setValue('Jo');
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(membersService.options).not.toHaveBeenCalled();
  });

  it('busca a partir de 3 caracteres', async () => {
    membersService.options.mockClear();
    const control = component.nameControl();
    control.setValue('Jos');
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(membersService.options).toHaveBeenCalledWith({
      q: 'Jos',
      limit: 15,
      excludeMemberId: undefined,
    });
  });
});
