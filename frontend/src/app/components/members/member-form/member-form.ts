import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MEMBER_GENDERS, MemberGender } from '@enums/member-gender';
import { MEMBER_MARITAL_STATUSES, MemberMaritalStatus } from '@enums/member-marital-status';
import { MEMBER_STATUSES, MemberStatus } from '@enums/member-status';
import { ICreateMember } from '@interfaces/ICreateMember';
import { IUpdateMember } from '@interfaces/IUpdateMember';
import { MembersService } from '@services/members-service';

@Component({
  selector: 'app-member-form',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './member-form.html',
  styleUrl: './member-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberForm implements OnInit {
  readonly #membersService = inject(MembersService);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);

  readonly statuses = MEMBER_STATUSES;
  readonly genders = MEMBER_GENDERS;
  readonly maritalStatuses = MEMBER_MARITAL_STATUSES;

  readonly isEditMode = signal(false);
  readonly memberId = signal<string | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal(false);
  readonly feedbackKey = signal<string | null>(null);

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
    const id = this.#route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.memberId.set(id);
      this.#loadMember(id);
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

  fieldInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
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
          void this.#router.navigate(['/members']);
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.feedbackKey.set(this.#mapSaveError(error));
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
          void this.#router.navigate(['/members']);
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.feedbackKey.set(this.#mapSaveError(error));
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

  #mapSaveError(error: HttpErrorResponse): string {
    if (error.status === 409) {
      return 'MEMBERS.CONFLICT_ERROR';
    }
    return 'MEMBERS.SAVE_ERROR';
  }
}
