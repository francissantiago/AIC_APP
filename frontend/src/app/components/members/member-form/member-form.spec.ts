import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { MembersService } from '@services/members-service';
import { translateServiceStub } from '../../../testing/translate-testing';
import { MemberForm } from './member-form';

describe('MemberForm', () => {
  let component: MemberForm;
  let fixture: ComponentFixture<MemberForm>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [MemberForm],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: MembersService,
          useValue: {
            getById: () => of(null),
            create: () => of({}),
            update: () => of({}),
          },
        },
      ],
    })
      .overrideComponent(MemberForm, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(MemberForm);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
