import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { MemberTransfersService } from '@services/member-transfers-service';
import { SecretariatService } from '@services/secretariat-service';
import { translateServiceStub } from '../../../testing/translate-testing';
import { MemberTransferWizard } from './member-transfer-wizard';

describe('MemberTransferWizard', () => {
  let fixture: ComponentFixture<MemberTransferWizard>;
  let component: MemberTransferWizard;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [MemberTransferWizard],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({ permissions: [] }),
            hasPermission: () => false,
          },
        },
        {
          provide: MemberTransfersService,
          useValue: {
            create: () =>
              of({
                id: 't1',
                documentId: 'd1',
                status: 'completed',
              }),
          },
        },
        {
          provide: SecretariatService,
          useValue: {
            uploadDocumentFile: () => of({}),
          },
        },
        {
          provide: ApiErrorService,
          useValue: { resolve: () => ({ displayMessage: 'error' }) },
        },
      ],
    })
      .overrideComponent(MemberTransferWizard, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(MemberTransferWizard);
    fixture.componentRef.setInput('memberId', 'mem-1');
    fixture.componentRef.setInput('memberFullName', 'Maria Silva');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.step()).toBe(1);
  });

  it('validates required destination fields before preview', () => {
    component.goPreview();
    expect(component.step()).toBe(1);
    expect(component.form.invalid).toBe(true);

    component.form.patchValue({
      destinationChurchName: 'Igreja Destino',
      destinationCity: 'Campinas',
    });
    component.goPreview();
    expect(component.step()).toBe(2);
  });
});
