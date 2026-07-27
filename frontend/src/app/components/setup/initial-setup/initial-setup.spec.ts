import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SetupService } from '@services/setup-service';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { translateServiceStub } from '../../../testing/translate-testing';
import { InitialSetup } from './initial-setup';

describe('InitialSetup', () => {
  let component: InitialSetup;
  let fixture: ComponentFixture<InitialSetup>;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let setupService: {
    loading: ReturnType<typeof signal<boolean>>;
    error: ReturnType<typeof signal<string | null>>;
    complete: ReturnType<typeof vi.fn>;
  };

  const validAdmin = {
    username: 'admin',
    email: 'admin@aic.org',
    fullName: 'Administrador Geral',
    password: 'S3nh@Forte!',
    passwordConfirm: 'S3nh@Forte!',
  };

  const emptyCongregation = {
    name: 'Igreja Central AIC',
    tradeName: '',
    document: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    foundationDate: '',
    website: '',
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    router = { navigate: vi.fn() };
    setupService = {
      loading: signal(false),
      error: signal<string | null>(null),
      complete: vi.fn().mockReturnValue(of({ needsSetup: false })),
    };

    await TestBed.configureTestingModule({
      imports: [InitialSetup],
      providers: [
        { provide: SetupService, useValue: setupService },
        { provide: Router, useValue: router },
        { provide: TranslateService, useValue: translateServiceStub() },
        { provide: TranslatePipe, useValue: { transform: (key: string) => key } },
      ],
    })
      .overrideComponent(InitialSetup, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(InitialSetup);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('next should stay on admin step while admin data is invalid', () => {
    component.next();

    expect(component.step()).toBe('admin');
  });

  it('next should advance from admin to congregation and then to confirm', () => {
    component.form.controls.admin.setValue(validAdmin);
    component.next();
    expect(component.step()).toBe('congregation');

    component.form.controls.congregation.setValue(emptyCongregation);
    component.next();
    expect(component.step()).toBe('confirm');
  });

  it('should flag password mismatch without calling the API', () => {
    component.form.controls.admin.setValue({ ...validAdmin, passwordConfirm: 'outra-senha' });
    component.next();

    expect(component.step()).toBe('admin');
    expect(component.passwordMismatch()).toBe(true);
    expect(setupService.complete).not.toHaveBeenCalled();
  });

  it('submit should omit empty optional congregation fields and navigate to login', () => {
    component.form.controls.admin.setValue(validAdmin);
    component.form.controls.congregation.setValue({ ...emptyCongregation, city: ' São Paulo ' });

    component.submit();

    expect(setupService.complete).toHaveBeenCalledWith({
      admin: {
        username: 'admin',
        email: 'admin@aic.org',
        fullName: 'Administrador Geral',
        password: 'S3nh@Forte!',
      },
      congregation: {
        name: 'Igreja Central AIC',
        city: 'São Paulo',
      },
    });
    expect(component.succeeded()).toBe(true);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('submit should not call the API when the form is invalid', () => {
    component.submit();

    expect(setupService.complete).not.toHaveBeenCalled();
    expect(component.step()).toBe('admin');
  });

  it('submit should mark already configured on HTTP 409', () => {
    setupService.complete.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409, statusText: 'Conflict' })),
    );

    component.form.controls.admin.setValue(validAdmin);
    component.form.controls.congregation.setValue(emptyCongregation);

    component.submit();

    expect(component.alreadyConfigured()).toBe(true);
    expect(component.submitFailed()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
