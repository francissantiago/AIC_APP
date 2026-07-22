import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { AuthService } from '@services/auth-service';
import { MembersService } from '@services/members-service';
import { MembershipCardsService } from '@services/membership-cards-service';
import { translateServiceStub } from '../../../testing/translate-testing';
import { MembershipCardsPage } from './membership-cards-page';

describe('MembershipCardsPage', () => {
  let component: MembershipCardsPage;
  let fixture: ComponentFixture<MembershipCardsPage>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [MembershipCardsPage],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({
              permissions: ['membership-cards:read', 'membership-cards:write'],
            }),
            hasPermission: (code: string) =>
              ['membership-cards:read', 'membership-cards:write'].includes(code),
          },
        },
        {
          provide: MembersService,
          useValue: {
            list: () => of({ data: [], total: 0, page: 1, limit: 50 }),
          },
        },
        {
          provide: MembershipCardsService,
          useValue: {
            getSettings: () =>
              of({
                id: '1',
                congregationId: '2',
                headerLine1: 'Test',
                headerLine2: null,
                ministryLabel: null,
                presidentName: null,
                presidentTitle: 'PASTORA PRESIDENTE',
                logoUrl: null,
                signatureUrl: null,
                logoDataUrl: null,
                signatureDataUrl: null,
                validityMonths: 24,
                footerNotice: 'notice',
                createdAt: '',
                updatedAt: '',
              }),
            getCard: () => of(null),
            getCards: () => of([]),
            updateSettings: () => of(null),
            uploadLogo: () => of(null),
            uploadSignature: () => of(null),
          },
        },
      ],
    })
      .overrideComponent(MembershipCardsPage, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(MembershipCardsPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
