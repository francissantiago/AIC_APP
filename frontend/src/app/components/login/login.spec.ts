import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '@services/auth-service';
import { translateServiceStub } from '../../testing/translate-testing';
import { of } from 'rxjs';
import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let authService: {
    loginLoading: ReturnType<typeof signal<boolean>>;
    loginError: ReturnType<typeof signal<string | null>>;
    login: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    authService = {
      loginLoading: signal(false),
      loginError: signal<string | null>(null),
      login: vi.fn().mockReturnValue(of({})),
    };

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
        { provide: TranslateService, useValue: translateServiceStub() },
        { provide: TranslatePipe, useValue: { transform: (key: string) => key } },
      ],
    })
      .overrideComponent(Login, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('submit should call AuthService.login when form is valid', () => {
    component.form.setValue({
      email: 'admin@admin.com',
      password: 'secret',
    });

    component.submit();

    expect(authService.login).toHaveBeenCalledWith({
      email: 'admin@admin.com',
      password: 'secret',
    });
  });

  it('submit should not call login when form is invalid', () => {
    component.form.setValue({ email: '', password: '' });

    component.submit();

    expect(authService.login).not.toHaveBeenCalled();
  });
});
