import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { AuthService } from '@services/auth-service';
import { MembersService } from '@services/members-service';
import { translateServiceStub } from '../../../testing/translate-testing';
import { MembersList } from './members-list';

describe('MembersList', () => {
  let component: MembersList;
  let fixture: ComponentFixture<MembersList>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [MembersList],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({ permissions: ['members:read', 'members:write'] }),
            hasPermission: (code: string) => ['members:read', 'members:write'].includes(code),
          },
        },
        {
          provide: MembersService,
          useValue: {
            list: () => of({ data: [], total: 0, page: 1, limit: 20 }),
            remove: () => of(undefined),
          },
        },
      ],
    })
      .overrideComponent(MembersList, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(MembersList);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
