import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { RolesService } from '@services/roles-service';
import { UsersService } from '@services/users-service';
import { translateServiceStub } from '../../../testing/translate-testing';
import { UserForm } from './user-form';

describe('UserForm', () => {
  let component: UserForm;
  let fixture: ComponentFixture<UserForm>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [UserForm],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: UsersService,
          useValue: {
            getById: () => of(null),
            create: () => of({}),
            update: () => of({}),
            setRoles: () => of({}),
          },
        },
        {
          provide: RolesService,
          useValue: { list: () => of([]) },
        },
      ],
    })
      .overrideComponent(UserForm, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(UserForm);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
