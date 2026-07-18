import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { FAMILY_RELATIONS, FamilyRelation } from '@enums/family-relation';
import { MemberStatus } from '@enums/member-status';
import { IFamilyMember } from '@interfaces/IFamilyMember';
import { IMember } from '@interfaces/IMember';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { FamiliesService } from '@services/families-service';
import { MembersService } from '@services/members-service';

@Component({
  selector: 'app-family-members-panel',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './family-members-panel.html',
  styleUrl: './family-members-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamilyMembersPanel implements OnInit {
  readonly #familiesService = inject(FamiliesService);
  readonly #membersService = inject(MembersService);
  readonly #auth = inject(AuthService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly familyId = input.required<string>();

  readonly relations = FAMILY_RELATIONS;
  readonly members = signal<IFamilyMember[]>([]);
  readonly memberOptions = signal<IMember[]>([]);
  readonly loading = signal(false);
  readonly linking = signal(false);
  readonly error = signal(false);
  readonly feedback = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly pendingUnlinkId = signal<string | null>(null);
  readonly unlinking = signal(false);

  readonly canWrite = computed(() => this.#auth.hasPermission('members:write'));
  readonly canReadMembers = computed(() => this.#auth.hasPermission('members:read'));

  readonly availableMembers = computed(() => {
    const linkedIds = new Set(this.members().map((item) => item.memberId));
    return this.memberOptions().filter((member) => !linkedIds.has(member.id));
  });

  readonly linkForm = new FormGroup({
    memberId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    relation: new FormControl<FamilyRelation>(FamilyRelation.OTHER, {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  ngOnInit(): void {
    this.#loadMembers();
    this.#loadMemberOptions();
  }

  relationLabelKey(relation: FamilyRelation): string {
    return `FAMILIES.RELATION_${relation.toUpperCase()}`;
  }

  linkMember(): void {
    if (!this.canWrite() || this.linkForm.invalid) {
      this.linkForm.markAllAsTouched();
      return;
    }

    const { memberId, relation } = this.linkForm.getRawValue();
    this.linking.set(true);
    this.feedback.set(null);
    this.errorMessage.set(null);

    this.#familiesService
      .addMember(this.familyId(), { memberId, relation })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.linking.set(false);
          this.linkForm.reset({ memberId: '', relation: FamilyRelation.OTHER });
          this.feedback.set('FAMILIES.SAVE_SUCCESS');
          this.#loadMembers();
        },
        error: (error: HttpErrorResponse) => {
          this.linking.set(false);
          const resolved = this.#apiError.resolve(error);
          this.errorMessage.set(resolved.displayMessage);
        },
      });
  }

  changeRelation(memberId: string, relation: FamilyRelation): void {
    if (!this.canWrite()) {
      return;
    }

    this.feedback.set(null);
    this.errorMessage.set(null);

    this.#familiesService
      .updateMember(this.familyId(), memberId, { relation })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (updated) => {
          this.members.update((list) =>
            list.map((item) => (item.memberId === memberId ? updated : item)),
          );
        },
        error: (error: HttpErrorResponse) => {
          const resolved = this.#apiError.resolve(error);
          this.errorMessage.set(resolved.displayMessage);
          this.#loadMembers();
        },
      });
  }

  askUnlink(memberId: string): void {
    this.pendingUnlinkId.set(memberId);
    this.feedback.set(null);
  }

  cancelUnlink(): void {
    this.pendingUnlinkId.set(null);
  }

  confirmUnlink(): void {
    const memberId = this.pendingUnlinkId();
    if (!memberId || !this.canWrite()) {
      return;
    }

    this.unlinking.set(true);
    this.errorMessage.set(null);

    this.#familiesService
      .removeMember(this.familyId(), memberId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.unlinking.set(false);
          this.pendingUnlinkId.set(null);
          this.feedback.set('FAMILIES.SAVE_SUCCESS');
          this.#loadMembers();
        },
        error: (error: HttpErrorResponse) => {
          this.unlinking.set(false);
          const resolved = this.#apiError.resolve(error);
          this.errorMessage.set(resolved.displayMessage);
        },
      });
  }

  onRelationSelect(memberId: string, event: Event): void {
    const value = (event.target as HTMLSelectElement).value as FamilyRelation;
    this.changeRelation(memberId, value);
  }

  #loadMembers(): void {
    this.loading.set(true);
    this.error.set(false);

    this.#familiesService
      .listMembers(this.familyId(), { page: 1, limit: 100 })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.members.set(response.data);
          this.loading.set(false);
        },
        error: () => {
          this.members.set([]);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }

  #loadMemberOptions(): void {
    if (!this.canReadMembers()) {
      return;
    }

    this.#membersService
      .list({ page: 1, limit: 100, status: MemberStatus.ACTIVE })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => this.memberOptions.set(response.data),
        error: () => this.memberOptions.set([]),
      });
  }
}
