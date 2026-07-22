import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MEMBER_STATUSES, MemberStatus } from '@enums/member-status';
import { MemberMaritalStatus } from '@enums/member-marital-status';
import { IMember } from '@interfaces/IMember';
import { IMembershipCard, IMembershipCardSettings } from '@interfaces/IMembershipCard';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { MembersService } from '@services/members-service';
import { MembershipCardsService } from '@services/membership-cards-service';
import { MembershipCardPreview } from '../membership-card-preview/membership-card-preview';
import {
  buildMembershipCardsPrintHtml,
  printMembershipCardsHtml,
} from '../membership-card-print.util';

const MAX_SELECTION = 50;

@Component({
  selector: 'app-membership-cards-page',
  imports: [ReactiveFormsModule, TranslatePipe, MembershipCardPreview],
  templateUrl: './membership-cards-page.html',
  styleUrl: './membership-cards-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembershipCardsPage implements OnInit {
  readonly #membersService = inject(MembersService);
  readonly #membershipCardsService = inject(MembershipCardsService);
  readonly #auth = inject(AuthService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #translate = inject(TranslateService);

  readonly statuses = MEMBER_STATUSES;
  readonly canWrite = computed(() => this.#auth.hasPermission('membership-cards:write'));

  readonly members = signal<IMember[]>([]);
  readonly membersLoading = signal(false);
  readonly membersError = signal(false);
  readonly search = signal('');
  readonly statusFilter = signal<MemberStatus | ''>('');
  readonly selectedIds = signal<string[]>([]);
  readonly cards = signal<IMembershipCard[]>([]);
  readonly cardsLoading = signal(false);
  readonly cardsError = signal(false);
  readonly previewSide = signal<'front' | 'back'>('front');
  readonly showSettings = signal(false);
  readonly settings = signal<IMembershipCardSettings | null>(null);
  readonly settingsSaving = signal(false);
  readonly settingsFeedback = signal<string | null>(null);
  readonly settingsError = signal<string | null>(null);

  readonly selectedCount = computed(() => this.selectedIds().length);
  readonly selectedCards = computed(() => this.cards());
  readonly primaryCard = computed(() => this.cards()[0] ?? null);

  readonly settingsForm = new FormGroup({
    headerLine1: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)],
    }),
    headerLine2: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(150)],
    }),
    ministryLabel: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(150)],
    }),
    presidentName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(150)],
    }),
    presidentTitle: new FormControl('PASTORA PRESIDENTE', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    validityMonths: new FormControl(24, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(120)],
    }),
    footerNotice: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(255)],
    }),
  });

  ngOnInit(): void {
    this.#loadMembers();
    this.#loadSettings();
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.search.set(value);
    this.#loadMembers();
  }

  onStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as MemberStatus | '';
    this.statusFilter.set(value);
    this.#loadMembers();
  }

  toggleMember(id: string): void {
    this.selectedIds.update((ids) => {
      if (ids.includes(id)) {
        return ids.filter((item) => item !== id);
      }
      if (ids.length >= MAX_SELECTION) {
        return ids;
      }
      return [...ids, id];
    });
  }

  isSelected(id: string): boolean {
    return this.selectedIds().includes(id);
  }

  formatMissingFields(fields: string[]): string {
    return fields
      .map((field) => {
        const key = `MEMBERSHIP_CARDS.MISSING_FIELD_${field}`;
        const translated = this.#translate.instant(key);
        return translated === key ? field : translated;
      })
      .join(', ');
  }

  generatePreview(): void {
    const ids = this.selectedIds();
    if (ids.length === 0) {
      return;
    }
    this.cardsLoading.set(true);
    this.cardsError.set(false);

    const onSuccess = (result: IMembershipCard | IMembershipCard[]): void => {
      this.cards.set(Array.isArray(result) ? result : [result]);
      this.cardsLoading.set(false);
    };
    const onError = (): void => {
      this.cardsLoading.set(false);
      this.cardsError.set(true);
    };

    if (ids.length === 1) {
      this.#membershipCardsService
        .getCard(ids[0])
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe({ next: onSuccess, error: onError });
      return;
    }

    this.#membershipCardsService
      .getCards(ids)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({ next: onSuccess, error: onError });
  }

  setSide(side: 'front' | 'back'): void {
    this.previewSide.set(side);
  }

  printCards(): void {
    if (!this.canWrite() || this.cards().length === 0) {
      return;
    }

    const labels = {
      cardLabel: this.#translate.instant('MEMBERSHIP_CARDS.CARD_LABEL'),
      fieldName: this.#translate.instant('MEMBERSHIP_CARDS.FIELD_NAME'),
      fieldFiliation: this.#translate.instant('MEMBERSHIP_CARDS.FIELD_FILIATION'),
      fieldBirthDate: this.#translate.instant('MEMBERSHIP_CARDS.FIELD_BIRTH_DATE'),
      fieldPlaceOfBirth: this.#translate.instant('MEMBERSHIP_CARDS.FIELD_PLACE_OF_BIRTH'),
      fieldPosition: this.#translate.instant('MEMBERSHIP_CARDS.FIELD_POSITION'),
      fieldBloodType: this.#translate.instant('MEMBERSHIP_CARDS.FIELD_BLOOD_TYPE'),
      fieldRegistration: this.#translate.instant('MEMBERSHIP_CARDS.FIELD_REGISTRATION'),
      fieldCpf: this.#translate.instant('MEMBERSHIP_CARDS.FIELD_CPF'),
      fieldRg: this.#translate.instant('MEMBERSHIP_CARDS.FIELD_RG'),
      fieldMaritalStatus: this.#translate.instant('MEMBERSHIP_CARDS.FIELD_MARITAL_STATUS'),
      fieldValidity: this.#translate.instant('MEMBERSHIP_CARDS.FIELD_VALIDITY'),
      maritalStatus: (status: MemberMaritalStatus) =>
        this.#translate.instant(`MEMBERS.MARITAL_${status.toUpperCase()}`),
    };

    const html = buildMembershipCardsPrintHtml(this.cards(), labels, {
      logoSrc: this.settings()?.logoDataUrl ?? null,
      signatureSrc: this.settings()?.signatureDataUrl ?? null,
    });
    printMembershipCardsHtml(html);
  }

  openSettings(): void {
    this.showSettings.set(true);
    if (!this.settings()) {
      this.#loadSettings();
    }
  }

  closeSettings(): void {
    this.showSettings.set(false);
  }

  saveSettings(): void {
    if (!this.canWrite() || this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched();
      return;
    }
    const raw = this.settingsForm.getRawValue();
    this.settingsSaving.set(true);
    this.settingsFeedback.set(null);
    this.settingsError.set(null);

    this.#membershipCardsService
      .updateSettings({
        headerLine1: raw.headerLine1.trim(),
        headerLine2: raw.headerLine2.trim() || null,
        ministryLabel: raw.ministryLabel.trim() || null,
        presidentName: raw.presidentName.trim() || null,
        presidentTitle: raw.presidentTitle.trim(),
        validityMonths: Number(raw.validityMonths),
        footerNotice: raw.footerNotice.trim(),
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (settings) => {
          this.settings.set(settings);
          this.#applySettingsToCards(settings);
          this.settingsSaving.set(false);
          this.settingsFeedback.set(null);
          this.settingsError.set(null);
          this.showSettings.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.settingsSaving.set(false);
          this.settingsError.set(this.#apiError.resolve(error).displayMessage);
        },
      });
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.canWrite()) {
      return;
    }
    this.#membershipCardsService
      .uploadLogo(file)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (settings) => {
          this.settings.set(settings);
          this.#applySettingsToCards(settings);
          input.value = '';
        },
        error: (error: HttpErrorResponse) => {
          this.settingsError.set(this.#apiError.resolve(error).displayMessage);
          input.value = '';
        },
      });
  }

  onSignatureSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.canWrite()) {
      return;
    }
    this.#membershipCardsService
      .uploadSignature(file)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (settings) => {
          this.settings.set(settings);
          this.#applySettingsToCards(settings);
          input.value = '';
        },
        error: (error: HttpErrorResponse) => {
          this.settingsError.set(this.#apiError.resolve(error).displayMessage);
          input.value = '';
        },
      });
  }

  removeLogo(): void {
    if (!this.canWrite() || !this.settings()?.logoDataUrl) {
      return;
    }
    this.#membershipCardsService
      .removeLogo()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (settings) => {
          this.settings.set(settings);
          this.#applySettingsToCards(settings);
        },
        error: (error: HttpErrorResponse) => {
          this.settingsError.set(this.#apiError.resolve(error).displayMessage);
        },
      });
  }

  removeSignature(): void {
    if (!this.canWrite() || !this.settings()?.signatureDataUrl) {
      return;
    }
    this.#membershipCardsService
      .removeSignature()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (settings) => {
          this.settings.set(settings);
          this.#applySettingsToCards(settings);
        },
        error: (error: HttpErrorResponse) => {
          this.settingsError.set(this.#apiError.resolve(error).displayMessage);
        },
      });
  }

  statusLabelKey(status: MemberStatus): string {
    return `MEMBERS.STATUS_${status.toUpperCase()}`;
  }

  #applySettingsToCards(settings: IMembershipCardSettings): void {
    this.cards.update((cards) =>
      cards.map((card) => ({
        ...card,
        institution: {
          headerLine1: settings.headerLine1,
          headerLine2: settings.headerLine2,
          ministryLabel: settings.ministryLabel,
          presidentName: settings.presidentName,
          presidentTitle: settings.presidentTitle,
          logoUrl: settings.logoUrl,
          signatureUrl: settings.signatureUrl,
          footerNotice: settings.footerNotice,
        },
      })),
    );

    if (this.selectedIds().length > 0) {
      this.generatePreview();
    }
  }

  #loadMembers(): void {
    this.membersLoading.set(true);
    this.membersError.set(false);
    this.#membersService
      .list({
        page: 1,
        limit: 50,
        q: this.search().trim() || undefined,
        status: this.statusFilter() || undefined,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (page) => {
          this.members.set(page.data);
          this.membersLoading.set(false);
        },
        error: () => {
          this.membersLoading.set(false);
          this.membersError.set(true);
        },
      });
  }

  #loadSettings(): void {
    this.#membershipCardsService
      .getSettings()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (settings) => {
          this.settings.set(settings);
          this.settingsForm.patchValue({
            headerLine1: settings.headerLine1,
            headerLine2: settings.headerLine2 ?? '',
            ministryLabel: settings.ministryLabel ?? '',
            presidentName: settings.presidentName ?? '',
            presidentTitle: settings.presidentTitle,
            validityMonths: settings.validityMonths,
            footerNotice: settings.footerNotice,
          });
        },
        error: (error: HttpErrorResponse) => {
          this.settingsError.set(this.#apiError.resolve(error).displayMessage);
        },
      });
  }
}
