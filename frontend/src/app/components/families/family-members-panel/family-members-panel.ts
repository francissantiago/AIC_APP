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
import {
  FAMILY_MEMBER_LINK_RELATIONS,
  FamilyMemberLinkRelation,
} from '@enums/family-member-link-relation';
import { FAMILY_RELATIONS, FamilyRelation } from '@enums/family-relation';
import { IFamilyGenealogy } from '@interfaces/IFamilyGenealogy';
import { IFamilyMember } from '@interfaces/IFamilyMember';
import { IRelationSummarySegment } from '@interfaces/IFamilyMemberRelation';
import { IMember } from '@interfaces/IMember';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { FamiliesService } from '@services/families-service';
import { MembersService } from '@services/members-service';
import { MemberStatus } from '@enums/member-status';
import { FamilyGenealogyTree } from '../family-genealogy-tree/family-genealogy-tree';

@Component({
  selector: 'app-family-members-panel',
  imports: [ReactiveFormsModule, TranslatePipe, FamilyGenealogyTree],
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
  /** Emitido quando membros ou vínculos explícitos mudam (para a lista pai recarregar). */
  readonly changed = output<void>();

  readonly relations = FAMILY_RELATIONS;
  readonly linkRelations = FAMILY_MEMBER_LINK_RELATIONS;
  readonly members = signal<IFamilyMember[]>([]);
  readonly memberOptions = signal<IMember[]>([]);
  readonly loading = signal(false);
  readonly linking = signal(false);
  readonly savingRelation = signal(false);
  readonly error = signal(false);
  readonly feedback = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly pendingUnlinkId = signal<string | null>(null);
  readonly unlinking = signal(false);
  readonly managingRelationsForMemberId = signal<string | null>(null);
  readonly pendingRelationRemoveId = signal<string | null>(null);
  readonly showGenealogy = signal(false);
  readonly genealogy = signal<IFamilyGenealogy | null>(null);
  readonly genealogyLoading = signal(false);
  readonly genealogyError = signal(false);

  readonly canWrite = computed(() => this.#auth.hasPermission('members:write'));
  readonly canReadMembers = computed(() => this.#auth.hasPermission('members:read'));
  readonly hasGenealogyTree = computed(
    () => (this.genealogy()?.roots.length ?? 0) > 0,
  );

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
    initialLinkRelation: new FormControl<FamilyMemberLinkRelation | ''>('', {
      nonNullable: true,
    }),
    initialRelatedMemberId: new FormControl('', { nonNullable: true }),
  });

  readonly relationForm = new FormGroup({
    relation: new FormControl<FamilyMemberLinkRelation>(FamilyMemberLinkRelation.PARENT_OF, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    relatedMemberId: new FormControl('', {
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

  /** Ex.: "Renata Menezes Duarte" → "Renata Duarte" */
  shortName(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return '';
    }
    if (parts.length === 1) {
      return parts[0]!;
    }
    return `${parts[0]} ${parts[parts.length - 1]}`;
  }

  segmentDisplayParams(segment: IRelationSummarySegment): Record<string, string> {
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(segment.params)) {
      if (key === 'names') {
        params[key] = value
          .split(',')
          .map((name) => this.shortName(name.trim()))
          .join(', ');
      } else {
        params[key] = this.shortName(value);
      }
    }
    return params;
  }

  linkRelationLabelKey(relation: FamilyMemberLinkRelation): string {
    switch (relation) {
      case FamilyMemberLinkRelation.PARENT_OF:
        return 'FAMILIES.LINK_PARENT_OF';
      case FamilyMemberLinkRelation.SPOUSE_OF:
        return 'FAMILIES.LINK_SPOUSE_OF';
      case FamilyMemberLinkRelation.SIBLING_OF:
        return 'FAMILIES.LINK_SIBLING_OF';
      default: {
        const exhaustive: never = relation;
        return exhaustive;
      }
    }
  }

  relatedMembersFor(memberId: string): IFamilyMember[] {
    return this.members().filter((item) => item.memberId !== memberId);
  }

  toggleManageRelations(memberId: string): void {
    if (this.managingRelationsForMemberId() === memberId) {
      this.managingRelationsForMemberId.set(null);
      return;
    }
    this.managingRelationsForMemberId.set(memberId);
    this.relationForm.reset({
      relation: FamilyMemberLinkRelation.PARENT_OF,
      relatedMemberId: '',
    });
    this.pendingRelationRemoveId.set(null);
  }

  linkMember(): void {
    if (!this.canWrite() || this.linkForm.invalid) {
      this.linkForm.markAllAsTouched();
      return;
    }

    const { memberId, relation, initialLinkRelation, initialRelatedMemberId } =
      this.linkForm.getRawValue();
    this.linking.set(true);
    this.feedback.set(null);
    this.errorMessage.set(null);

    this.#familiesService
      .addMember(this.familyId(), { memberId, relation })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          if (initialLinkRelation && initialRelatedMemberId) {
            this.#createRelationForMember(
              memberId,
              initialLinkRelation,
              initialRelatedMemberId,
              () => {
                this.linking.set(false);
                this.linkForm.reset({
                  memberId: '',
                  relation: FamilyRelation.OTHER,
                  initialLinkRelation: '',
                  initialRelatedMemberId: '',
                });
                this.feedback.set('FAMILIES.SAVE_SUCCESS');
                this.#afterStructureChange();
              },
              () => {
                this.linking.set(false);
                this.#afterStructureChange();
              },
            );
            return;
          }

          this.linking.set(false);
          this.linkForm.reset({
            memberId: '',
            relation: FamilyRelation.OTHER,
            initialLinkRelation: '',
            initialRelatedMemberId: '',
          });
          this.feedback.set('FAMILIES.SAVE_SUCCESS');
          this.#afterStructureChange();
        },
        error: (error: HttpErrorResponse) => {
          this.linking.set(false);
          const resolved = this.#apiError.resolve(error);
          this.errorMessage.set(resolved.displayMessage);
        },
      });
  }

  addRelationForMember(memberId: string): void {
    if (!this.canWrite() || this.relationForm.invalid) {
      this.relationForm.markAllAsTouched();
      return;
    }

    const { relation, relatedMemberId } = this.relationForm.getRawValue();
    this.savingRelation.set(true);
    this.errorMessage.set(null);

    this.#createRelationForMember(
      memberId,
      relation,
      relatedMemberId,
      () => {
        this.savingRelation.set(false);
        this.relationForm.reset({
          relation: FamilyMemberLinkRelation.PARENT_OF,
          relatedMemberId: '',
        });
        this.feedback.set('FAMILIES.SAVE_SUCCESS');
        this.#afterStructureChange();
      },
      () => {
        this.savingRelation.set(false);
      },
    );
  }

  askRemoveRelation(relationId: string): void {
    this.pendingRelationRemoveId.set(relationId);
  }

  cancelRemoveRelation(): void {
    this.pendingRelationRemoveId.set(null);
  }

  confirmRemoveRelation(): void {
    const relationId = this.pendingRelationRemoveId();
    if (!relationId || !this.canWrite()) {
      return;
    }

    this.savingRelation.set(true);
    this.errorMessage.set(null);

    this.#familiesService
      .removeMemberRelation(this.familyId(), relationId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.savingRelation.set(false);
          this.pendingRelationRemoveId.set(null);
          this.feedback.set('FAMILIES.SAVE_SUCCESS');
          this.#afterStructureChange();
        },
        error: (error: HttpErrorResponse) => {
          this.savingRelation.set(false);
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
        next: () => {
          // PATCH devolve DTO sem relations/summary — recarrega a lista completa.
          this.#loadMembers();
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
          this.managingRelationsForMemberId.set(null);
          this.feedback.set('FAMILIES.SAVE_SUCCESS');
          this.#afterStructureChange();
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

  openGenealogy(): void {
    this.showGenealogy.set(true);
    this.#loadGenealogy();
  }

  closeGenealogy(): void {
    this.showGenealogy.set(false);
  }

  #afterStructureChange(): void {
    this.changed.emit();
    this.#loadMembers();
    if (this.showGenealogy()) {
      this.#loadGenealogy();
    }
  }

  #loadGenealogy(): void {
    this.genealogyLoading.set(true);
    this.genealogyError.set(false);

    this.#familiesService
      .getGenealogy(this.familyId())
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.genealogy.set(response);
          this.genealogyLoading.set(false);
        },
        error: () => {
          this.genealogy.set(null);
          this.genealogyLoading.set(false);
          this.genealogyError.set(true);
        },
      });
  }

  #createRelationForMember(
    subjectMemberId: string,
    relation: FamilyMemberLinkRelation,
    relatedMemberId: string,
    onSuccess: () => void,
    onError: () => void,
  ): void {
    const body =
      relation === FamilyMemberLinkRelation.PARENT_OF
        ? {
            fromMemberId: subjectMemberId,
            toMemberId: relatedMemberId,
            relation,
          }
        : {
            fromMemberId: subjectMemberId,
            toMemberId: relatedMemberId,
            relation,
          };

    this.#familiesService
      .createMemberRelation(this.familyId(), body)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => onSuccess(),
        error: (error: HttpErrorResponse) => {
          const resolved = this.#apiError.resolve(error);
          this.errorMessage.set(resolved.displayMessage);
          onError();
        },
      });
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
