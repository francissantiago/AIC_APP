import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { ReadStream } from 'fs';
import * as path from 'path';
import * as QRCode from 'qrcode';
import { In, Repository } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { CongregationsService } from '../congregations/congregations.service';
import { FamilyMember } from '../families/entities/family-member.entity';
import { FamilyRelation } from '../families/enums/family-relation.enum';
import { Member } from '../members/entities/member.entity';
import { MemberStatus } from '../members/enums/member-status.enum';
import { MinistryMember } from '../ministries/entities/ministry-member.entity';
import { MinistryMemberRole } from '../ministries/enums/ministry-member-role.enum';
import { FileStorageService } from '../secretariat/storage/file-storage.service';
import { UploadedFile } from '../secretariat/storage/uploaded-file.interface';
import { MembershipCardResponseDto } from './dto/membership-card-response.dto';
import { MembershipCardSettingsResponseDto } from './dto/membership-card-settings-response.dto';
import { MembershipCardVerifyResponseDto } from './dto/membership-card-verify-response.dto';
import { UpdateMembershipCardSettingsDto } from './dto/update-membership-card-settings.dto';
import { MembershipCardSettings } from './entities/membership-card-settings.entity';

const DEFAULT_FOOTER =
  'Válida somente com a apresentação de documento de identificação com foto';
const DEFAULT_PRESIDENT_TITLE = 'PASTORA PRESIDENTE';
const DEFAULT_VALIDITY_MONTHS = 24;
const MAX_BATCH = 50;
const LOGO_SUBDIR = 'membership-cards/logos';
const SIGNATURE_SUBDIR = 'membership-cards/signatures';
const DEFAULT_FRONTEND_APP_URL = 'http://localhost:4200';

const ROLE_LABELS: Readonly<Record<MinistryMemberRole, string>> = {
  [MinistryMemberRole.LEADER]: 'Líder',
  [MinistryMemberRole.ASSISTANT]: 'Auxiliar',
  [MinistryMemberRole.MEMBER]: 'Membro',
};

function mimeFromPath(relativePath: string): string {
  const ext = path.extname(relativePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

function formatDateInTimezone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

function addMonthsIso(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCMonth(date.getUTCMonth() + months);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Injectable()
export class MembershipCardsService {
  private readonly logger = new Logger(MembershipCardsService.name);
  private readonly timeZone: string;

  constructor(
    @InjectRepository(MembershipCardSettings)
    private readonly settingsRepository: Repository<MembershipCardSettings>,
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    @InjectRepository(FamilyMember)
    private readonly familyMembersRepository: Repository<FamilyMember>,
    @InjectRepository(MinistryMember)
    private readonly ministryMembersRepository: Repository<MinistryMember>,
    private readonly congregationsService: CongregationsService,
    private readonly fileStorageService: FileStorageService,
    private readonly configService: ConfigService,
  ) {
    this.timeZone =
      this.configService.get<string>('APP_TIMEZONE')?.trim() ||
      'America/Sao_Paulo';
  }

  private async getCongregationId(
    activeCongregationId?: string,
  ): Promise<string> {
    if (activeCongregationId) {
      return activeCongregationId;
    }
    return (await this.congregationsService.getOrCreateBase()).id;
  }

  async getSettings(
    activeCongregationId?: string,
  ): Promise<MembershipCardSettingsResponseDto> {
    const settings = await this.getOrCreateSettings(activeCongregationId);
    return this.toSettingsResponse(settings);
  }

  async updateSettings(
    dto: UpdateMembershipCardSettingsDto,
    activeCongregationId?: string,
  ): Promise<MembershipCardSettingsResponseDto> {
    const settings = await this.getOrCreateSettings(activeCongregationId);

    if (dto.headerLine1 !== undefined) {
      settings.headerLine1 = dto.headerLine1;
    }
    if (dto.headerLine2 !== undefined) {
      settings.headerLine2 = dto.headerLine2 ?? null;
    }
    if (dto.ministryLabel !== undefined) {
      settings.ministryLabel = dto.ministryLabel ?? null;
    }
    if (dto.presidentName !== undefined) {
      settings.presidentName = dto.presidentName ?? null;
    }
    if (dto.presidentTitle !== undefined) {
      settings.presidentTitle = dto.presidentTitle;
    }
    if (dto.validityMonths !== undefined) {
      settings.validityMonths = dto.validityMonths;
    }
    if (dto.footerNotice !== undefined) {
      settings.footerNotice = dto.footerNotice;
    }

    const saved = await this.settingsRepository.save(settings);
    this.logger.log(`Settings de carteirinha atualizados: ${saved.id}`);
    return this.toSettingsResponse(saved);
  }

  async uploadLogo(
    file: UploadedFile | undefined,
    activeCongregationId?: string,
  ): Promise<MembershipCardSettingsResponseDto> {
    const settings = await this.getOrCreateSettings(activeCongregationId);
    const previous = settings.logoPath;
    const savedFile = await this.fileStorageService.saveImageAsset(
      LOGO_SUBDIR,
      settings.id,
      file as UploadedFile,
    );
    settings.logoPath = savedFile.relativePath;
    const saved = await this.settingsRepository.save(settings);
    if (previous && previous !== saved.logoPath) {
      await this.fileStorageService.deleteIfExists(previous);
    }
    return this.toSettingsResponse(saved);
  }

  async uploadSignature(
    file: UploadedFile | undefined,
    activeCongregationId?: string,
  ): Promise<MembershipCardSettingsResponseDto> {
    const settings = await this.getOrCreateSettings(activeCongregationId);
    const previous = settings.signaturePath;
    const savedFile = await this.fileStorageService.saveImageAsset(
      SIGNATURE_SUBDIR,
      settings.id,
      file as UploadedFile,
    );
    settings.signaturePath = savedFile.relativePath;
    const saved = await this.settingsRepository.save(settings);
    if (previous && previous !== saved.signaturePath) {
      await this.fileStorageService.deleteIfExists(previous);
    }
    return this.toSettingsResponse(saved);
  }

  async removeLogo(
    activeCongregationId?: string,
  ): Promise<MembershipCardSettingsResponseDto> {
    const settings = await this.getOrCreateSettings(activeCongregationId);
    const previous = settings.logoPath;
    settings.logoPath = null;
    const saved = await this.settingsRepository.save(settings);
    await this.fileStorageService.deleteIfExists(previous);
    return this.toSettingsResponse(saved);
  }

  async removeSignature(
    activeCongregationId?: string,
  ): Promise<MembershipCardSettingsResponseDto> {
    const settings = await this.getOrCreateSettings(activeCongregationId);
    const previous = settings.signaturePath;
    settings.signaturePath = null;
    const saved = await this.settingsRepository.save(settings);
    await this.fileStorageService.deleteIfExists(previous);
    return this.toSettingsResponse(saved);
  }

  async getLogoStream(activeCongregationId?: string): Promise<{
    stream: ReadStream;
    mimeType: string;
  }> {
    const settings = await this.getOrCreateSettings(activeCongregationId);
    if (!settings.logoPath) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_NOT_FOUND,
        message:
          ApiErrorMessage[ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_NOT_FOUND],
      });
    }
    const opened = await this.fileStorageService.openReadStream(
      settings.logoPath,
    );
    return {
      stream: opened.stream,
      mimeType: mimeFromPath(settings.logoPath),
    };
  }

  async getLogoFile(activeCongregationId?: string): Promise<{
    buffer: Buffer;
    mimeType: string;
  }> {
    const settings = await this.getOrCreateSettings(activeCongregationId);
    if (!settings.logoPath) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_NOT_FOUND,
        message:
          ApiErrorMessage[ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_NOT_FOUND],
      });
    }
    const buffer = await this.fileStorageService.readFileBuffer(
      settings.logoPath,
    );
    return { buffer, mimeType: mimeFromPath(settings.logoPath) };
  }

  async getSignatureStream(activeCongregationId?: string): Promise<{
    stream: ReadStream;
    mimeType: string;
  }> {
    const settings = await this.getOrCreateSettings(activeCongregationId);
    if (!settings.signaturePath) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_NOT_FOUND,
        message:
          ApiErrorMessage[ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_NOT_FOUND],
      });
    }
    const opened = await this.fileStorageService.openReadStream(
      settings.signaturePath,
    );
    return {
      stream: opened.stream,
      mimeType: mimeFromPath(settings.signaturePath),
    };
  }

  async getSignatureFile(activeCongregationId?: string): Promise<{
    buffer: Buffer;
    mimeType: string;
  }> {
    const settings = await this.getOrCreateSettings(activeCongregationId);
    if (!settings.signaturePath) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_NOT_FOUND,
        message:
          ApiErrorMessage[ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_NOT_FOUND],
      });
    }
    const buffer = await this.fileStorageService.readFileBuffer(
      settings.signaturePath,
    );
    return { buffer, mimeType: mimeFromPath(settings.signaturePath) };
  }

  async getCard(
    memberId: string,
    activeCongregationId?: string,
  ): Promise<MembershipCardResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const member = await this.membersRepository.findOne({
      where: { id: memberId, congregationId },
    });
    if (!member) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.MEMBERS_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.MEMBERS_NOT_FOUND],
      });
    }
    const settings = await this.getOrCreateSettings(congregationId);
    return this.assembleCard(member, settings);
  }

  /**
   * Validação pública da carteirinha (QR Code) — sem autenticação.
   * Expõe apenas dados necessários para conferência visual.
   */
  async verifyPublic(
    memberId: string,
  ): Promise<MembershipCardVerifyResponseDto> {
    const member = await this.membersRepository.findOne({
      where: { id: memberId },
      relations: ['congregation'],
    });

    if (!member) {
      return {
        valid: false,
        memberId: null,
        registrationNumber: null,
        fullName: null,
        status: null,
        congregationName: null,
        birthDate: null,
        message: 'Membro não encontrado',
      };
    }

    const isActive = member.status === MemberStatus.ACTIVE;
    return {
      valid: isActive,
      memberId: member.id,
      registrationNumber: member.registrationNumber,
      fullName: member.fullName,
      status: member.status,
      congregationName: member.congregation?.name ?? null,
      birthDate: member.birthDate,
      message: isActive
        ? 'Carteirinha válida'
        : 'Membro encontrado, porém não está ativo',
    };
  }

  async getCardsBatch(
    memberIds: string[],
    activeCongregationId?: string,
  ): Promise<MembershipCardResponseDto[]> {
    if (memberIds.length > MAX_BATCH) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: ApiErrorCode.SYS_BAD_REQUEST,
        message: ApiErrorMessage[ApiErrorCode.SYS_BAD_REQUEST],
      });
    }
    const uniqueIds = [...new Set(memberIds)];
    const congregationId = await this.getCongregationId(activeCongregationId);
    const members = await this.membersRepository.find({
      where: { id: In(uniqueIds), congregationId },
    });
    if (members.length !== uniqueIds.length) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.MEMBERS_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.MEMBERS_NOT_FOUND],
      });
    }
    const settings = await this.getOrCreateSettings(congregationId);
    const byId = new Map(members.map((m) => [m.id, m]));
    const cards: MembershipCardResponseDto[] = [];
    for (const id of uniqueIds) {
      const member = byId.get(id)!;
      cards.push(await this.assembleCard(member, settings));
    }
    return cards;
  }

  async getOrCreateSettings(
    activeCongregationId?: string,
  ): Promise<MembershipCardSettings> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const existing = await this.settingsRepository.findOne({
      where: { congregationId },
    });
    if (existing) {
      return existing;
    }

    const congregation =
      await this.congregationsService.getBase(congregationId);
    const created = this.settingsRepository.create({
      congregationId,
      headerLine1: congregation.name.slice(0, 150),
      headerLine2: null,
      ministryLabel: null,
      presidentName: null,
      presidentTitle: DEFAULT_PRESIDENT_TITLE,
      logoPath: null,
      signaturePath: null,
      validityMonths: DEFAULT_VALIDITY_MONTHS,
      footerNotice: DEFAULT_FOOTER,
    });
    const saved = await this.settingsRepository.save(created);
    this.logger.log(
      `Settings de carteirinha criados (lazy) para congregação ${congregationId}`,
    );
    return saved;
  }

  private async assembleCard(
    member: Member,
    settings: MembershipCardSettings,
  ): Promise<MembershipCardResponseDto> {
    const issuedAt = formatDateInTimezone(new Date(), this.timeZone);
    const validUntil = addMonthsIso(issuedAt, settings.validityMonths);

    const filiation = await this.resolveFiliation(member);
    const placeOfBirth = this.resolvePlaceOfBirth(member);
    const positionTitle = await this.resolvePositionTitle(member);
    const photoDataUrl = await this.toDataUrl(member.photoPath);
    const { verificationUrl, qrCodeDataUrl } =
      await this.buildVerificationQr(member.id);

    const missingFields: string[] = [];
    if (!member.photoPath) missingFields.push('photo');
    if (!filiation) missingFields.push('filiation');
    if (!member.birthDate) missingFields.push('birthDate');
    if (!placeOfBirth) missingFields.push('placeOfBirth');
    if (!positionTitle) missingFields.push('positionTitle');
    if (!member.bloodType) missingFields.push('bloodType');
    if (!member.registrationNumber) missingFields.push('registrationNumber');
    if (!member.document) missingFields.push('cpf');
    if (!member.rg) missingFields.push('rg');

    const warnings: string[] = [];
    if (member.status !== MemberStatus.ACTIVE) {
      warnings.push('inactive_member');
    }

    return {
      memberId: member.id,
      issuedAt,
      validUntil,
      front: {
        fullName: member.fullName,
        filiation,
        birthDate: member.birthDate,
        placeOfBirth,
        positionTitle,
        bloodType: member.bloodType,
        registrationNumber: member.registrationNumber,
        photoUrl: member.photoPath ? `/api/members/${member.id}/photo` : null,
        photoDataUrl,
      },
      back: {
        cpf: member.document,
        rg: member.rg,
        maritalStatus: member.maritalStatus,
        validUntil,
        verificationUrl,
        qrCodeDataUrl,
      },
      institution: {
        headerLine1: settings.headerLine1,
        headerLine2: settings.headerLine2,
        ministryLabel: settings.ministryLabel,
        presidentName: settings.presidentName,
        presidentTitle: settings.presidentTitle,
        logoUrl: settings.logoPath
          ? '/api/membership-cards/settings/logo'
          : null,
        signatureUrl: settings.signaturePath
          ? '/api/membership-cards/settings/signature'
          : null,
        footerNotice: settings.footerNotice,
      },
      missingFields,
      warnings,
    };
  }

  private async resolveFiliation(member: Member): Promise<string | null> {
    const parts = [member.fatherName, member.motherName].filter(
      (name): name is string => Boolean(name?.trim()),
    );
    if (parts.length > 0) {
      return parts.join('\n');
    }

    const selfLink = await this.familyMembersRepository.findOne({
      where: { memberId: member.id },
    });
    if (!selfLink) {
      return null;
    }

    const parents = await this.familyMembersRepository.find({
      where: {
        familyId: selfLink.familyId,
        relation: FamilyRelation.PARENT,
      },
      relations: ['member'],
    });
    const parentNames = parents
      .filter((link) => link.memberId !== member.id)
      .map((link) => link.member?.fullName?.trim())
      .filter((name): name is string => Boolean(name));
    if (parentNames.length === 0) {
      return null;
    }
    return parentNames.join('\n');
  }

  private resolvePlaceOfBirth(member: Member): string | null {
    if (member.placeOfBirth?.trim()) {
      return member.placeOfBirth.trim();
    }
    const city = member.city?.trim();
    const state = member.state?.trim();
    if (city && state) return `${city} / ${state}`;
    if (city) return city;
    if (state) return state;
    return null;
  }

  private async resolvePositionTitle(member: Member): Promise<string | null> {
    if (member.positionTitle?.trim()) {
      return member.positionTitle.trim();
    }

    const link = await this.ministryMembersRepository.findOne({
      where: { memberId: member.id },
      relations: ['ministry'],
      order: { joinedAt: 'ASC' },
    });
    if (!link?.ministry) {
      return null;
    }
    const roleLabel = ROLE_LABELS[link.role] ?? link.role;
    return `${link.ministry.name} (${roleLabel})`;
  }

  private async toSettingsResponse(
    settings: MembershipCardSettings,
  ): Promise<MembershipCardSettingsResponseDto> {
    const [logoDataUrl, signatureDataUrl] = await Promise.all([
      this.toDataUrl(settings.logoPath),
      this.toDataUrl(settings.signaturePath),
    ]);
    return MembershipCardSettingsResponseDto.fromEntity(settings, {
      logoDataUrl,
      signatureDataUrl,
    });
  }

  private async toDataUrl(relativePath: string | null): Promise<string | null> {
    if (!relativePath) {
      return null;
    }
    try {
      const buffer = await this.fileStorageService.readFileBuffer(relativePath);
      const mime = mimeFromPath(relativePath);
      return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch (error) {
      this.logger.warn(
        `Não foi possível embutir asset ${relativePath}: ${String(error)}`,
      );
      return null;
    }
  }

  private resolveFrontendAppUrl(): string {
    const configured =
      this.configService.get<string>('FRONTEND_APP_URL')?.trim() ||
      this.configService.get<string>('CORS_ORIGIN')?.split(',')[0]?.trim() ||
      DEFAULT_FRONTEND_APP_URL;
    return configured.replace(/\/$/, '');
  }

  private async buildVerificationQr(
    memberId: string,
  ): Promise<{ verificationUrl: string; qrCodeDataUrl: string }> {
    const verificationUrl = `${this.resolveFrontendAppUrl()}/verify-membership-card/${memberId}`;
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 320,
      color: { dark: '#111111', light: '#ffffff' },
    });
    return { verificationUrl, qrCodeDataUrl };
  }
}
