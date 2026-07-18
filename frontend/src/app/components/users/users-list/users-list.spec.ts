import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { AuthService } from '@services/auth-service';
import { RolesService } from '@services/roles-service';
import { UsersService } from '@services/users-service';
import { translateServiceStub } from '../../../testing/translate-testing';
import { UsersList } from './users-list';

describe('UsersList', () => {
  let component: UsersList;
  let fixture: ComponentFixture<UsersList>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [UsersList],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({ permissions: ['users:read', 'users:write'] }),
            hasPermission: (code: string) => ['users:read', 'users:write'].includes(code),
          },
        },
        {
          provide: UsersService,
          useValue: {
            list: () => of({ data: [], total: 0, page: 1, limit: 20 }),
            remove: () => of(undefined),
          },
        },
        {
          provide: RolesService,
          useValue: { list: () => of([]) },
        },
      ],
    })
      .overrideComponent(UsersList, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(UsersList);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
