import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { UserStatus } from '@enums/user-status';
import { IUser } from '@interfaces/IUser';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { translateServiceStub } from '../../../testing/translate-testing';
import { of } from 'rxjs';
import { ProfilePage } from './profile-page';

describe('ProfilePage', () => {
  let component: ProfilePage;
  let fixture: ComponentFixture<ProfilePage>;

  const user: IUser = {
    id: '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f',
    username: 'admin',
    email: 'admin@admin.com',
    fullName: 'Administrador',
    status: UserStatus.ACTIVE,
    twoFactorEnabled: false,
    lastLoginAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    roles: [],
    permissions: [],
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [
        {
          provide: AuthService,
          useValue: {
            currentUser: signal(user),
            loadMe: vi.fn().mockReturnValue(of(user)),
            updateMe: vi.fn().mockReturnValue(of(user)),
            changePassword: vi.fn().mockReturnValue(of(undefined)),
            setupTwoFactor: vi.fn(),
            verifyTwoFactor: vi.fn(),
            disableTwoFactor: vi.fn(),
          },
        },
        {
          provide: ApiErrorService,
          useValue: { resolve: () => ({ displayMessage: 'error' }) },
        },
        { provide: TranslateService, useValue: translateServiceStub() },
        { provide: TranslatePipe, useValue: { transform: (key: string) => key } },
      ],
    })
      .overrideComponent(ProfilePage, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose profile, password and 2FA forms (three sections)', () => {
    expect(component.profileForm).toBeTruthy();
    expect(component.passwordForm).toBeTruthy();
    expect(component.verifyForm).toBeTruthy();
    expect(component.disableForm).toBeTruthy();
    expect(component.profileForm.getRawValue().username).toBe('admin');
  });
});
