import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { DateDisplayService } from '@services/date-display-service';
import { I18nService } from '@services/i18n-service';
import { translateServiceStub } from '../../testing/translate-testing';
import { DateInput } from './date-input';

describe('DateInput', () => {
  let fixture: ComponentFixture<DateInput>;
  let control: FormControl<string>;

  beforeEach(async () => {
    control = new FormControl('', { nonNullable: true });
    await TestBed.configureTestingModule({
      imports: [DateInput],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: I18nService,
          useValue: { currentLang: () => 'pt-BR' },
        },
        {
          provide: DateDisplayService,
          useValue: {
            format: (value: string) => {
              const [year, month, day] = value.split('-');
              return `${day}/${month}/${year}`;
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DateInput);
    fixture.componentRef.setInput('control', control);
    fixture.componentRef.setInput('inputId', 'test-date');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('normaliza colagem dd/mm/aaaa para ISO', () => {
    const component = fixture.componentInstance;
    component.displayControl.setValue('19/07/1945');
    component.onInputBlur();
    expect(control.value).toBe('1945-07-19');
  });
});
