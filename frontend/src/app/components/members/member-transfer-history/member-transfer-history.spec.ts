import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { ApiErrorService } from '@services/api-error.service';
import { MemberTransfersService } from '@services/member-transfers-service';
import { SecretariatService } from '@services/secretariat-service';
import { translateServiceStub } from '../../../testing/translate-testing';
import { MemberTransferHistory } from './member-transfer-history';

describe('MemberTransferHistory', () => {
  let fixture: ComponentFixture<MemberTransferHistory>;
  let component: MemberTransferHistory;
  const list = vi.fn(() => of([]));

  beforeEach(async () => {
    list.mockClear();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [MemberTransferHistory],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: MemberTransfersService,
          useValue: {
            list,
            complete: () => of({}),
            cancel: () => of({}),
          },
        },
        {
          provide: SecretariatService,
          useValue: {
            downloadDocumentFile: () => of(new Blob()),
          },
        },
        {
          provide: ApiErrorService,
          useValue: { resolve: () => ({ displayMessage: 'error' }) },
        },
      ],
    })
      .overrideComponent(MemberTransferHistory, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(MemberTransferHistory);
    fixture.componentRef.setInput('memberId', 'mem-1');
    fixture.componentRef.setInput('canWrite', true);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and show empty history', () => {
    expect(component).toBeTruthy();
    expect(list).toHaveBeenCalledWith('mem-1');
    expect(component.transfers().length).toBe(0);
  });
});
