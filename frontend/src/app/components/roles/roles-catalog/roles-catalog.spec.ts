import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { AuthService } from '@services/auth-service';
import { RolesService } from '@services/roles-service';
import { translateServiceStub } from '../../../testing/translate-testing';
import { RolesCatalog } from './roles-catalog';

describe('RolesCatalog', () => {
  let component: RolesCatalog;
  let fixture: ComponentFixture<RolesCatalog>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [RolesCatalog],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: RolesService,
          useValue: { list: () => of([]), delete: () => of(undefined) },
        },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({
              id: '1',
              roles: [
                {
                  id: 1,
                  code: 'ADMIN',
                  name: 'Administrador',
                  description: null,
                  permissions: [],
                },
              ],
            }),
          },
        },
      ],
    })
      .overrideComponent(RolesCatalog, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(RolesCatalog);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
