import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { ClassAgeGroup } from '@enums/class-age-group';
import { ClassStatus } from '@enums/class-status';
import { ClassesService } from '@services/classes-service';
import { of } from 'rxjs';
import { translateServiceStub } from '../../../testing/translate-testing';
import { ClassForm } from './class-form';

describe('ClassForm', () => {
  let component: ClassForm;
  let fixture: ComponentFixture<ClassForm>;
  const create = vi.fn(() =>
    of({
      id: 'c1',
      congregationId: 'cong1',
      name: 'Classe de Jovens',
      description: null,
      ageGroup: ClassAgeGroup.YOUTH,
      teacherMemberId: null,
      teacher: null,
      dayOfWeek: 0,
      startTime: null,
      room: null,
      status: ClassStatus.ACTIVE,
      createdAt: '',
      updatedAt: '',
    }),
  );

  beforeEach(async () => {
    TestBed.resetTestingModule();
    create.mockClear();
    await TestBed.configureTestingModule({
      imports: [ClassForm],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: ClassesService,
          useValue: {
            getById: () => of(null),
            create,
            update: () => of({}),
            teacherOptions: () => of([]),
          },
        },
      ],
    })
      .overrideComponent(ClassForm, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ClassForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('calls create on valid submit', () => {
    component.form.patchValue({
      name: 'Classe de Jovens',
      ageGroup: ClassAgeGroup.YOUTH,
      dayOfWeek: 0,
      status: ClassStatus.ACTIVE,
    });
    component.submit();
    expect(create).toHaveBeenCalled();
  });
});
