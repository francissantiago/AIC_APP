import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MEMBER_GENDERS, MemberGender } from '@enums/member-gender';
import { MEMBER_MARITAL_STATUSES, MemberMaritalStatus } from '@enums/member-marital-status';
import { MEMBER_STATUSES, MemberStatus } from '@enums/member-status';
import { ClassAgeGroup } from '@enums/class-age-group';
import { ClassEnrollmentStatus } from '@enums/class-enrollment-status';
import { ClassStatus } from '@enums/class-status';
import { MINISTRY_MEMBER_ROLES, MinistryMemberRole } from '@enums/ministry-member-role';
import { ICreateMember } from '@interfaces/ICreateMember';
import { IMemberClassSummary } from '@interfaces/IMemberClassSummary';
import { IMinistry } from '@interfaces/IMinistry';
import { IUpdateMember } from '@interfaces/IUpdateMember';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { ClassesService } from '@services/classes-service';
import { MembersService } from '@services/members-service';
import { MinistriesService } from '@services/ministries-service';

type MemberFormTab = 'details' | 'ministries' | 'ebd';

@Component({
  selector: 'app-member-form',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './member-form.html',
  styleUrl: './member-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberForm implements OnInit {
  readonly #membersService = inject(MembersService);
  readonly #ministriesService = inject(MinistriesService);
  readonly #classesService = inject(ClassesService);
  readonly #auth = inject(AuthService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly memberId = input<string | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly statuses = MEMBER_STATUSES;
  readonly genders = MEMBER_GENDERS;
  readonly maritalStatuses = MEMBER_MARITAL_STATUSES;
  readonly ministryRoles = MINISTRY_MEMBER_ROLES;

  readonly isEditMode = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal(false);
  readonly feedbackKey = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly supportHint = signal<string | null>(null);

  readonly activeTab = signal<MemberFormTab>('details');
  readonly memberMinistries = signal<IMinistry[]>([]);
  readonly allMinistries = signal<IMinistry[]>([]);
  readonly ministriesLoading = signal(false);
  readonly ministriesError = signal(false);
  readonly ministriesFeedback = signal<string | null>(null);
  readonly ministriesErrorMessage = signal<string | null>(null);
  readonly linkingMinistry = signal(false);
  readonly pendingUnlinkMinistryId = signal<string | null>(null);

  readonly canReadMinistries = computed(() => this.#auth.hasPermission('ministries:read'));
  readonly canWriteMinistries = computed(() => this.#auth.hasPermission('ministries:write'));
  readonly canReadClasses = computed(() => this.#auth.hasPermission('classes:read'));
  readonly showMinistriesTab = computed(() => this.isEditMode() && this.canReadMinistries());
  readonly showEbdTab = computed(() => this.isEditMode() && this.canReadClasses());
  readonly showSideTabs = computed(() => this.showMinistriesTab() || this.showEbdTab());

  readonly memberClasses = signal<IMemberClassSummary[]>([]);
  readonly ebdClassesLoading = signal(false);
  readonly ebdClassesError = signal(false);

  readonly availableMinistries = computed(() => {
    const linkedIds = new Set(this.memberMinistries().map((item) => item.id));
    return this.allMinistries().filter((ministry) => !linkedIds.has(ministry.id));
  });

  readonly linkMinistryForm = new FormGroup({
    ministryId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    role: new FormControl<MinistryMemberRole>(MinistryMemberRole.MEMBER, {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  readonly form = new FormGroup({
    fullName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1), Validators.maxLength(150)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.email, Validators.maxLength(255)],
    }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(30)],
    }),
    document: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(30)],
    }),
    birthDate: new FormControl('', { nonNullable: true }),
    gender: new FormControl<MemberGender>(MemberGender.UNSPECIFIED, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    maritalStatus: new FormControl<MemberMaritalStatus>(MemberMaritalStatus.OTHER, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    status: new FormControl<MemberStatus>(MemberStatus.ACTIVE, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    baptismDate: new FormControl('', { nonNullable: true }),
    membershipDate: new FormControl('', { nonNullable: true }),
    address: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(255)],
    }),
    city: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(100)],
    }),
    state: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(50)],
    }),
    zipCode: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(20)],
    }),
    notes: new FormControl('', { nonNullable: true }),
    userId: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    const id = this.memberId();
    if (id) {
      this.isEditMode.set(true);
      this.#loadMember(id);
      if (this.canReadMinistries()) {
        this.#loadMemberMinistries(id);
      }
      if (this.canReadClasses()) {
        this.#loadMemberClasses(id);
      }
    }
  }

  statusLabelKey(status: MemberStatus): string {
    return `MEMBERS.STATUS_${status.toUpperCase()}`;
  }

  genderLabelKey(gender: MemberGender): string {
    return `MEMBERS.GENDER_${gender.toUpperCase()}`;
  }

  maritalLabelKey(status: MemberMaritalStatus): string {
    return `MEMBERS.MARITAL_${status.toUpperCase()}`;
  }

  ministryRoleLabelKey(role: MinistryMemberRole): string {
    return `MINISTRIES.ROLE_${role.toUpperCase()}`;
  }

  ageGroupLabelKey(ageGroup: ClassAgeGroup): string {
    return `EBD_CLASSES.AGE_GROUP_${ageGroup.toUpperCase()}`;
  }

  classStatusLabelKey(status: ClassStatus): string {
    return status === ClassStatus.ACTIVE ? 'EBD_CLASSES.ACTIVE' : 'EBD_CLASSES.INACTIVE';
  }

  enrollmentStatusLabelKey(status: ClassEnrollmentStatus): string {
    return `EBD_ENROLLMENTS.STATUS_${status.toUpperCase()}`;
  }

  selectTab(tab: MemberFormTab): void {
    this.activeTab.set(tab);
    if (tab === 'ministries' && this.canWriteMinistries() && this.allMinistries().length === 0) {
      this.#loadAllMinistries();
    }
  }

  fieldInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  linkMinistry(): void {
    const memberId = this.memberId();
    if (!memberId || !this.canWriteMinistries() || this.linkMinistryForm.invalid) {
      this.linkMinistryForm.markAllAsTouched();
      return;
    }

    const { ministryId, role } = this.linkMinistryForm.getRawValue();
    this.linkingMinistry.set(true);
    this.ministriesFeedback.set(null);
    this.ministriesErrorMessage.set(null);

    this.#ministriesService
      .addMember(ministryId, { memberId, role })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.linkingMinistry.set(false);
          this.linkMinistryForm.reset({
            ministryId: '',
            role: MinistryMemberRole.MEMBER,
          });
          this.ministriesFeedback.set('MINISTRIES.LINK_SUCCESS');
          this.#loadMemberMinistries(memberId);
        },
        error: (error: HttpErrorResponse) => {
          this.linkingMinistry.set(false);
          const resolved = this.#apiError.resolve(error);
          this.ministriesErrorMessage.set(resolved.displayMessage);
        },
      });
  }

  askUnlinkMinistry(ministryId: string): void {
    this.pendingUnlinkMinistryId.set(ministryId);
  }

  cancelUnlinkMinistry(): void {
    this.pendingUnlinkMinistryId.set(null);
  }

  confirmUnlinkMinistry(): void {
    const memberId = this.memberId();
    const ministryId = this.pendingUnlinkMinistryId();
    if (!memberId || !ministryId || !this.canWriteMinistries()) {
      return;
    }

    this.ministriesErrorMessage.set(null);

    this.#ministriesService
      .removeMember(ministryId, memberId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.pendingUnlinkMinistryId.set(null);
          this.ministriesFeedback.set('MINISTRIES.UNLINK_SUCCESS');
          this.#loadMemberMinistries(memberId);
        },
        error: (error: HttpErrorResponse) => {
          const resolved = this.#apiError.resolve(error);
          this.ministriesErrorMessage.set(resolved.displayMessage);
        },
      });
  }

  submit(): void {
    this.feedbackKey.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.isEditMode()) {
      this.#submitEdit();
      return;
    }

    this.#submitCreate();
  }

  #loadMember(id: string): void {
    this.loading.set(true);
    this.loadError.set(false);

    this.#membersService
      .getById(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (member) => {
          this.form.patchValue({
            fullName: member.fullName,
            email: member.email ?? '',
            phone: member.phone ?? '',
            document: member.document ?? '',
            birthDate: member.birthDate ?? '',
            gender: member.gender,
            maritalStatus: member.maritalStatus,
            status: member.status,
            baptismDate: member.baptismDate ?? '',
            membershipDate: member.membershipDate ?? '',
            address: member.address ?? '',
            city: member.city ?? '',
            state: member.state ?? '',
            zipCode: member.zipCode ?? '',
            notes: member.notes ?? '',
            userId: member.userId ?? '',
          });
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set(true);
          this.feedbackKey.set('MEMBERS.LOAD_ERROR');
        },
      });
  }

  #submitCreate(): void {
    const body = this.#buildPayload();
    this.saving.set(true);

    this.#membersService
      .create(body)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.#applySaveError(error);
        },
      });
  }

  #submitEdit(): void {
    const id = this.memberId();
    if (!id) {
      return;
    }

    const body: IUpdateMember = this.#buildPayload();
    this.saving.set(true);

    this.#membersService
      .update(id, body)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.feedbackKey.set('MEMBERS.SAVE_SUCCESS');
          this.saved.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.#applySaveError(error);
        },
      });
  }

  #buildPayload(): ICreateMember {
    const raw = this.form.getRawValue();
    const payload: ICreateMember = {
      fullName: raw.fullName.trim(),
      gender: raw.gender,
      maritalStatus: raw.maritalStatus,
      status: raw.status,
    };

    const email = raw.email.trim();
    if (email) {
      payload.email = email;
    }
    const phone = raw.phone.trim();
    if (phone) {
      payload.phone = phone;
    }
    const document = raw.document.trim();
    if (document) {
      payload.document = document;
    }
    if (raw.birthDate) {
      payload.birthDate = raw.birthDate;
    }
    if (raw.baptismDate) {
      payload.baptismDate = raw.baptismDate;
    }
    if (raw.membershipDate) {
      payload.membershipDate = raw.membershipDate;
    }
    const address = raw.address.trim();
    if (address) {
      payload.address = address;
    }
    const city = raw.city.trim();
    if (city) {
      payload.city = city;
    }
    const state = raw.state.trim();
    if (state) {
      payload.state = state;
    }
    const zipCode = raw.zipCode.trim();
    if (zipCode) {
      payload.zipCode = zipCode;
    }
    const notes = raw.notes.trim();
    if (notes) {
      payload.notes = notes;
    }
    const userId = raw.userId.trim();
    if (userId) {
      payload.userId = userId;
    }

    return payload;
  }

  #applySaveError(error: HttpErrorResponse): void {
    const resolved = this.#apiError.resolve(error);
    this.feedbackKey.set(null);
    this.errorMessage.set(resolved.displayMessage);
    this.supportHint.set(resolved.supportHint ?? null);
  }

  #loadMemberMinistries(memberId: string): void {
    this.ministriesLoading.set(true);
    this.ministriesError.set(false);

    this.#ministriesService
      .listByMember(memberId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (ministries) => {
          this.memberMinistries.set(ministries);
          this.ministriesLoading.set(false);
        },
        error: () => {
          this.memberMinistries.set([]);
          this.ministriesLoading.set(false);
          this.ministriesError.set(true);
        },
      });
  }

  #loadAllMinistries(): void {
    this.#ministriesService
      .list({ page: 1, limit: 100 })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => this.allMinistries.set(response.data),
        error: () => this.allMinistries.set([]),
      });
  }

  #loadMemberClasses(memberId: string): void {
    this.ebdClassesLoading.set(true);
    this.ebdClassesError.set(false);

    this.#classesService
      .listByMember(memberId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (classes) => {
          this.memberClasses.set(classes);
          this.ebdClassesLoading.set(false);
        },
        error: () => {
          this.memberClasses.set([]);
          this.ebdClassesLoading.set(false);
          this.ebdClassesError.set(true);
        },
      });
  }
}
