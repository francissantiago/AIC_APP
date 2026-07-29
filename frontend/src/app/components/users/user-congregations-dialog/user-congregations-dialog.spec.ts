import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { CongregationType } from '@enums/congregation-type';
import { of } from 'rxjs';
import { ApiErrorService } from '@services/api-error.service';
import { CongregationsService } from '@services/congregations-service';
import { UserCongregationsService } from '@services/user-congregations-service';
import { translateServiceStub } from '../../../testing/translate-testing';
import { UserCongregationsDialog } from './user-congregations-dialog';

describe('UserCongregationsDialog', () => {
  let component: UserCongregationsDialog;
  let fixture: ComponentFixture<UserCongregationsDialog>;
  const setForUser = vi.fn(() =>
    of([
      {
        congregationId: 'hq-1',
        congregationName: 'Matriz',
        congregationType: CongregationType.HEADQUARTERS,
        isDefault: true,
        assignedAt: '2026-01-01T00:00:00Z',
      },
    ]),
  );

  beforeEach(async () => {
    TestBed.resetTestingModule();
    setForUser.mockClear();

    await TestBed.configureTestingModule({
      imports: [UserCongregationsDialog],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: UserCongregationsService,
          useValue: {
            listForUser: () =>
              of([
                {
                  congregationId: 'hq-1',
                  congregationName: 'Matriz',
                  congregationType: CongregationType.HEADQUARTERS,
                  isDefault: true,
                  assignedAt: '2026-01-01T00:00:00Z',
                },
              ]),
            setForUser,
          },
        },
        {
          provide: CongregationsService,
          useValue: {
            findAll: () =>
              of({
                data: [
                  {
                    id: 'hq-1',
                    name: 'Matriz',
                    type: CongregationType.HEADQUARTERS,
                    status: 'active',
                  },
                ],
                total: 1,
                page: 1,
                limit: 100,
              }),
          },
        },
        {
          provide: ApiErrorService,
          useValue: { resolve: () => ({ displayMessage: 'error' }) },
        },
      ],
    })
      .overrideComponent(UserCongregationsDialog, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(UserCongregationsDialog);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('userId', 'user-1');
    fixture.componentRef.setInput('userDisplayName', 'Ana Silva');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('validates at least one congregation before save', () => {
    component.form.setValue({ selectedIds: [], defaultCongregationId: '' });
    component.save();
    expect(component.validationKey()).toBe('USERS.CONGREGATIONS_ERROR_MIN_ONE');
    expect(setForUser).not.toHaveBeenCalled();
  });

  it('saves selected congregations', () => {
    component.form.setValue({ selectedIds: ['hq-1'], defaultCongregationId: 'hq-1' });
    component.save();
    expect(setForUser).toHaveBeenCalledWith('user-1', {
      congregationIds: ['hq-1'],
      defaultCongregationId: 'hq-1',
    });
  });
});
