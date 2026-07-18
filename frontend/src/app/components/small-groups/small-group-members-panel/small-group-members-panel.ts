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
import { SMALL_GROUP_MEMBER_ROLES, SmallGroupMemberRole } from '@enums/small-group-member-role';
import {
  SMALL_GROUP_MEMBER_STATUSES,
  SmallGroupMemberStatus,
} from '@enums/small-group-member-status';
import { ISmallGroupMember } from '@interfaces/ISmallGroupMember';
import { ISmallGroupMemberOption } from '@interfaces/ISmallGroupMemberOption';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { SmallGroupsService } from '@services/small-groups-service';

@Component({
  selector: 'app-small-group-members-panel',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './small-group-members-panel.html',
  styleUrl: './small-group-members-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SmallGroupMembersPanel implements OnInit {
  readonly #smallGroupsService = inject(SmallGroupsService);
  readonly #auth = inject(AuthService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly groupId = input.required<string>();

  readonly roles = SMALL_GROUP_MEMBER_ROLES;
  readonly statuses = SMALL_GROUP_MEMBER_STATUSES;
  readonly members = signal<ISmallGroupMember[]>([]);
  readonly memberOptions = signal<ISmallGroupMemberOption[]>([]);
  readonly loading = signal(false);
  readonly linking = signal(false);
  readonly error = signal(false);
  readonly feedback = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly pendingUnlinkId = signal<string | null>(null);
  readonly unlinking = signal(false);

  readonly canWrite = computed(() => this.#auth.hasPermission('small-groups:write'));

  readonly linkForm = new FormGroup({
    memberId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    role: new FormControl<SmallGroupMemberRole>(SmallGroupMemberRole.MEMBER, {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  ngOnInit(): void {
    this.#loadMembers();
    this.#loadMemberOptions();
  }

  roleLabelKey(role: SmallGroupMemberRole): string {
    return `SMALL_GROUPS.ROLE_${role.toUpperCase()}`;
  }

  statusLabelKey(status: SmallGroupMemberStatus): string {
    return `SMALL_GROUPS.MEMBER_STATUS_${status.toUpperCase()}`;
  }

  linkMember(): void {
    if (!this.canWrite() || this.linkForm.invalid) {
      this.linkForm.markAllAsTouched();
      return;
    }

    const { memberId, role } = this.linkForm.getRawValue();
    this.linking.set(true);
    this.feedback.set(null);
    this.errorMessage.set(null);

    this.#smallGroupsService
      .addMember(this.groupId(), { memberId, role })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.linking.set(false);
          this.linkForm.reset({ memberId: '', role: SmallGroupMemberRole.MEMBER });
          this.feedback.set('SMALL_GROUPS.LINK_SUCCESS');
          this.#loadMembers();
          this.#loadMemberOptions();
        },
        error: (error: HttpErrorResponse) => {
          this.linking.set(false);
          const resolved = this.#apiError.resolve(error);
          this.errorMessage.set(resolved.displayMessage);
        },
      });
  }

  changeRole(memberId: string, role: SmallGroupMemberRole): void {
    if (!this.canWrite()) {
      return;
    }

    this.feedback.set(null);
    this.errorMessage.set(null);

    this.#smallGroupsService
      .updateMember(this.groupId(), memberId, { role })
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

  changeStatus(memberId: string, status: SmallGroupMemberStatus): void {
    if (!this.canWrite()) {
      return;
    }

    this.feedback.set(null);
    this.errorMessage.set(null);

    this.#smallGroupsService
      .updateMember(this.groupId(), memberId, { status })
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

    this.#smallGroupsService
      .removeMember(this.groupId(), memberId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.unlinking.set(false);
          this.pendingUnlinkId.set(null);
          this.feedback.set('SMALL_GROUPS.UNLINK_SUCCESS');
          this.#loadMembers();
          this.#loadMemberOptions();
        },
        error: (error: HttpErrorResponse) => {
          this.unlinking.set(false);
          const resolved = this.#apiError.resolve(error);
          this.errorMessage.set(resolved.displayMessage);
        },
      });
  }

  onRoleSelect(memberId: string, event: Event): void {
    const value = (event.target as HTMLSelectElement).value as SmallGroupMemberRole;
    this.changeRole(memberId, value);
  }

  onStatusSelect(memberId: string, event: Event): void {
    const value = (event.target as HTMLSelectElement).value as SmallGroupMemberStatus;
    this.changeStatus(memberId, value);
  }

  #loadMembers(): void {
    this.loading.set(true);
    this.error.set(false);

    this.#smallGroupsService
      .listMembers(this.groupId(), { page: 1, limit: 100 })
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
    this.#smallGroupsService
      .memberOptions(this.groupId(), { limit: 100 })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (options) => this.memberOptions.set(options),
        error: () => this.memberOptions.set([]),
      });
  }
}
