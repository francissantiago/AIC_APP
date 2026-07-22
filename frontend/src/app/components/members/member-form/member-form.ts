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
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MEMBER_GENDERS, MemberGender } from '@enums/member-gender';
import { MEMBER_MARITAL_STATUSES, MemberMaritalStatus } from '@enums/member-marital-status';
import { MEMBER_STATUSES, MemberStatus } from '@enums/member-status';
import { MemberTransferStatus } from '@enums/member-transfer-status';
import { ClassAgeGroup } from '@enums/class-age-group';
import { ClassEnrollmentStatus } from '@enums/class-enrollment-status';
import { ClassStatus } from '@enums/class-status';
import { MINISTRY_MEMBER_ROLES, MinistryMemberRole } from '@enums/ministry-member-role';
import { ICreateMember } from '@interfaces/ICreateMember';
import { IFamily } from '@interfaces/IFamily';
import { IMemberClassSummary } from '@interfaces/IMemberClassSummary';
import { IMemberTransfer } from '@interfaces/IMemberTransfer';
import { IMinistry } from '@interfaces/IMinistry';
import { IUpdateMember } from '@interfaces/IUpdateMember';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { ClassesService } from '@services/classes-service';
import { FamiliesService } from '@services/families-service';
import { MemberTransfersService } from '@services/member-transfers-service';
import { MembersService } from '@services/members-service';
import { MinistriesService } from '@services/ministries-service';
import { MemberTransferHistory } from '../member-transfer-history/member-transfer-history';
import { MemberTransferWizard } from '../member-transfer-wizard/member-transfer-wizard';

type MemberFormTab = 'details' | 'ministries' | 'ebd' | 'family' | 'transfers';

@Component({
  selector: 'app-member-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    MemberTransferHistory,
    MemberTransferWizard,
  ],
  templateUrl: './member-form.html',
  styleUrl: './member-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberForm implements OnInit {
  readonly #membersService = inject(MembersService);
  readonly #ministriesService = inject(MinistriesService);
  readonly #classesService = inject(ClassesService);
  readonly #familiesService = inject(FamiliesService);
  readonly #transfersService = inject(MemberTransfersService);
  readonly #auth = inject(AuthService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly memberId = input<string | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly statuses = MEMBER_STATUSES;
  readonly MemberStatus = MemberStatus;
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
  readonly canReadMembers = computed(() => this.#auth.hasPermission('members:read'));
  readonly canWriteMembers = computed(() => this.#auth.hasPermission('members:write'));
  readonly canReadSecretariat = computed(() => this.#auth.hasPermission('secretariat:read'));
  readonly showMinistriesTab = computed(() => this.isEditMode() && this.canReadMinistries());
  readonly showEbdTab = computed(() => this.isEditMode() && this.canReadClasses());
  readonly showFamilyTab = computed(() => this.isEditMode() && this.canReadMembers());
  readonly showTransfersTab = computed(() => this.isEditMode() && this.canReadMembers());
  readonly showSideTabs = computed(
    () =>
      this.showMinistriesTab() ||
      this.showEbdTab() ||
      this.showFamilyTab() ||
      this.showTransfersTab(),
  );

  readonly memberClasses = signal<IMemberClassSummary[]>([]);
  readonly ebdClassesLoading = signal(false);
  readonly ebdClassesError = signal(false);

  readonly memberFamily = signal<IFamily | null>(null);
  readonly familyLoading = signal(false);
  readonly familyError = signal(false);
  readonly familyErrorMessage = signal<string | null>(null);

  readonly memberStatus = signal<MemberStatus>(MemberStatus.ACTIVE);
  readonly memberFullName = signal('');
  readonly transfers = signal<IMemberTransfer[]>([]);
  readonly transfersLoading = signal(false);
  readonly showTransferWizard = signal(false);
  readonly transfersReloadToken = signal(0);

  readonly hasPendingTransfer = computed(() =>
    this.transfers().some((item) => item.status === MemberTransferStatus.PENDING),
  );
  readonly canStartTransfer = computed(
    () =>
      this.canWriteMembers() &&
      this.memberStatus() === MemberStatus.ACTIVE &&
      !this.hasPendingTransfer(),
  );

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
    rg: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(30)],
    }),
    placeOfBirth: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(150)],
    }),
    bloodType: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(10)],
    }),
    fatherName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(150)],
    }),
    motherName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(150)],
    }),
    positionTitle: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(100)],
    }),
    userId: new FormControl('', { nonNullable: true }),
  });

  readonly photoUrl = signal<string | null>(null);
  readonly photoObjectUrl = signal<string | null>(null);
  readonly photoUploading = signal(false);
  readonly pendingPhotoFile = signal<File | null>(null);
  readonly registrationNumber = signal<string | null>(null);

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
      if (this.canReadMembers()) {
        this.#loadMemberFamily(id);
        this.#loadTransfers(id);
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

  openTransferWizard(): void {
    if (!this.canStartTransfer()) {
      return;
    }
    this.showTransferWizard.set(true);
  }

  closeTransferWizard(): void {
    this.showTransferWizard.set(false);
  }

  onTransferWizardCompleted(): void {
    this.showTransferWizard.set(false);
    const id = this.memberId();
    if (id) {
      this.#loadMember(id);
      this.#loadTransfers(id);
      this.transfersReloadToken.update((value) => value + 1);
    }
  }

  onTransfersChanged(): void {
    const id = this.memberId();
    if (id) {
      this.#loadMember(id);
      this.#loadTransfers(id);
      this.transfersReloadToken.update((value) => value + 1);
    }
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.canWriteMembers()) {
      return;
    }

    this.#revokePhotoObjectUrl();
    this.photoObjectUrl.set(URL.createObjectURL(file));

    const id = this.memberId();
    if (!id) {
      this.pendingPhotoFile.set(file);
      input.value = '';
      return;
    }

    this.pendingPhotoFile.set(null);
    this.photoUploading.set(true);
    this.#membersService
      .uploadPhoto(id, file)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (member) => {
          this.photoUploading.set(false);
          this.photoUrl.set(member.photoUrl);
          this.#loadPhotoBlob(member.id, member.photoUrl);
          this.feedbackKey.set('MEMBERS.SAVE_SUCCESS');
        },
        error: (error: HttpErrorResponse) => {
          this.photoUploading.set(false);
          this.#applySaveError(error);
        },
      });
    input.value = '';
  }

  removePhoto(): void {
    const id = this.memberId();
    if (!this.canWriteMembers()) {
      return;
    }

    if (!id) {
      this.pendingPhotoFile.set(null);
      this.photoUrl.set(null);
      this.#revokePhotoObjectUrl();
      return;
    }

    this.photoUploading.set(true);
    this.#membersService
      .removePhoto(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.photoUploading.set(false);
          this.photoUrl.set(null);
          this.#revokePhotoObjectUrl();
          this.feedbackKey.set('MEMBERS.SAVE_SUCCESS');
        },
        error: (error: HttpErrorResponse) => {
          this.photoUploading.set(false);
          this.#applySaveError(error);
        },
      });
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
            rg: member.rg ?? '',
            placeOfBirth: member.placeOfBirth ?? '',
            bloodType: member.bloodType ?? '',
            fatherName: member.fatherName ?? '',
            motherName: member.motherName ?? '',
            positionTitle: member.positionTitle ?? '',
            userId: member.userId ?? '',
          });
          this.memberStatus.set(member.status);
          this.memberFullName.set(member.fullName);
          this.registrationNumber.set(member.registrationNumber);
          this.photoUrl.set(member.photoUrl);
          this.#loadPhotoBlob(member.id, member.photoUrl);
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
        next: (member) => {
          const pendingPhoto = this.pendingPhotoFile();
          if (!pendingPhoto) {
            this.saving.set(false);
            this.saved.emit();
            return;
          }

          this.#membersService
            .uploadPhoto(member.id, pendingPhoto)
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe({
              next: () => {
                this.pendingPhotoFile.set(null);
                this.saving.set(false);
                this.saved.emit();
              },
              error: (error: HttpErrorResponse) => {
                this.saving.set(false);
                this.#applySaveError(error);
              },
            });
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
    const rg = raw.rg.trim();
    if (rg) {
      payload.rg = rg;
    }
    const placeOfBirth = raw.placeOfBirth.trim();
    if (placeOfBirth) {
      payload.placeOfBirth = placeOfBirth;
    }
    const bloodType = raw.bloodType.trim();
    if (bloodType) {
      payload.bloodType = bloodType;
    }
    const fatherName = raw.fatherName.trim();
    if (fatherName) {
      payload.fatherName = fatherName;
    }
    const motherName = raw.motherName.trim();
    if (motherName) {
      payload.motherName = motherName;
    }
    const positionTitle = raw.positionTitle.trim();
    if (positionTitle) {
      payload.positionTitle = positionTitle;
    }
    const userId = raw.userId.trim();
    if (userId) {
      payload.userId = userId;
    }

    return payload;
  }

  #loadPhotoBlob(memberId: string, photoUrl: string | null): void {
    this.#revokePhotoObjectUrl();
    if (!photoUrl) {
      return;
    }
    this.#membersService
      .getPhotoBlob(memberId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (blob) => this.photoObjectUrl.set(URL.createObjectURL(blob)),
      });
  }

  #revokePhotoObjectUrl(): void {
    const current = this.photoObjectUrl();
    if (current) {
      URL.revokeObjectURL(current);
      this.photoObjectUrl.set(null);
    }
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

  #loadMemberFamily(memberId: string): void {
    this.familyLoading.set(true);
    this.familyError.set(false);
    this.familyErrorMessage.set(null);
    this.memberFamily.set(null);

    this.#familiesService
      .getByMember(memberId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (family) => {
          this.memberFamily.set(family);
          this.familyLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.familyLoading.set(false);
          const resolved = this.#apiError.resolve(error);
          if (error.status === 404 && resolved.code === 'FAMILIES.MEMBER_FAMILY_NOT_FOUND') {
            this.memberFamily.set(null);
            this.familyError.set(false);
            return;
          }

          this.memberFamily.set(null);
          this.familyError.set(true);
          this.familyErrorMessage.set(resolved.displayMessage);
        },
      });
  }

  #loadTransfers(memberId: string): void {
    this.transfersLoading.set(true);
    this.#transfersService
      .list(memberId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (items) => {
          this.transfers.set(items);
          this.transfersLoading.set(false);
        },
        error: () => {
          this.transfers.set([]);
          this.transfersLoading.set(false);
        },
      });
  }
}
