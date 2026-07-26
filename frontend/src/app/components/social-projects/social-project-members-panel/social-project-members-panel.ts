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
import {
  SOCIAL_PROJECT_MEMBER_ROLES,
  SocialProjectMemberRole,
} from '@enums/social-project-member-role';
import { IMember } from '@interfaces/IMember';
import { ISocialProjectMember } from '@interfaces/ISocialProjectMember';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { MembersService } from '@services/members-service';
import { SocialProjectsService } from '@services/social-projects-service';

@Component({
  selector: 'app-social-project-members-panel',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './social-project-members-panel.html',
  styleUrl: './social-project-members-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialProjectMembersPanel implements OnInit {
  readonly #projectsService = inject(SocialProjectsService);
  readonly #membersService = inject(MembersService);
  readonly #auth = inject(AuthService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly projectId = input.required<string>();

  readonly roles = SOCIAL_PROJECT_MEMBER_ROLES;
  readonly members = signal<ISocialProjectMember[]>([]);
  readonly memberOptions = signal<IMember[]>([]);
  readonly loading = signal(false);
  readonly linking = signal(false);
  readonly error = signal(false);
  readonly feedback = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly pendingUnlinkId = signal<string | null>(null);
  readonly unlinking = signal(false);

  readonly canWrite = computed(() => this.#auth.hasPermission('social-projects:write'));
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
    role: new FormControl<SocialProjectMemberRole>(SocialProjectMemberRole.PARTICIPANT, {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  ngOnInit(): void {
    this.#loadMembers();
    this.#loadMemberOptions();
  }

  roleLabelKey(role: SocialProjectMemberRole): string {
    return `SOCIAL_PROJECTS.ROLE_${role.toUpperCase()}`;
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

    this.#projectsService
      .addMember(this.projectId(), { memberId, role })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.linking.set(false);
          this.linkForm.reset({ memberId: '', role: SocialProjectMemberRole.PARTICIPANT });
          this.feedback.set('SOCIAL_PROJECTS.LINK_SUCCESS');
          this.#loadMembers();
        },
        error: (error: HttpErrorResponse) => {
          this.linking.set(false);
          const resolved = this.#apiError.resolve(error);
          this.errorMessage.set(resolved.displayMessage);
        },
      });
  }

  changeRole(memberId: string, role: SocialProjectMemberRole): void {
    if (!this.canWrite()) {
      return;
    }

    this.feedback.set(null);
    this.errorMessage.set(null);

    this.#projectsService
      .updateMemberRole(this.projectId(), memberId, { role })
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

    this.#projectsService
      .removeMember(this.projectId(), memberId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.unlinking.set(false);
          this.pendingUnlinkId.set(null);
          this.feedback.set('SOCIAL_PROJECTS.UNLINK_SUCCESS');
          this.#loadMembers();
        },
        error: (error: HttpErrorResponse) => {
          this.unlinking.set(false);
          const resolved = this.#apiError.resolve(error);
          this.errorMessage.set(resolved.displayMessage);
        },
      });
  }

  onRoleSelect(memberId: string, event: Event): void {
    const value = (event.target as HTMLSelectElement).value as SocialProjectMemberRole;
    this.changeRole(memberId, value);
  }

  #loadMembers(): void {
    this.loading.set(true);
    this.error.set(false);

    this.#projectsService
      .listMembers(this.projectId(), { page: 1, limit: 100 })
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
      .list({ page: 1, limit: 100 })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => this.memberOptions.set(response.data),
        error: () => this.memberOptions.set([]),
      });
  }
}
