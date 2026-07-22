import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApiException } from '../../common/errors/api.exception';
import { CongregationsService } from '../congregations/congregations.service';
import { FamilyMember } from '../families/entities/family-member.entity';
import { Member } from '../members/entities/member.entity';
import { MemberGender } from '../members/enums/member-gender.enum';
import { MemberMaritalStatus } from '../members/enums/member-marital-status.enum';
import { MemberStatus } from '../members/enums/member-status.enum';
import { MinistryMember } from '../ministries/entities/ministry-member.entity';
import { FileStorageService } from '../secretariat/storage/file-storage.service';
import { MembershipCardSettings } from './entities/membership-card-settings.entity';
import { MembershipCardsService } from './membership-cards.service';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,qr'),
}));

describe('MembershipCardsService', () => {
  let service: MembershipCardsService;

  const congregationId = 'cccccccc-dddd-eeee-ffff-000000000001';
  const otherCongregationId = 'cccccccc-dddd-eeee-ffff-000000000002';

  const settingsRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const membersRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };
  const familyMembersRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };
  const ministryMembersRepository = {
    findOne: jest.fn(),
  };
  const congregationsService = {
    getOrCreateBase: jest.fn(),
    getBase: jest.fn(),
  };
  const fileStorageService = {
    saveImageAsset: jest.fn(),
    deleteIfExists: jest.fn(),
    openReadStream: jest.fn(),
    readFileBuffer: jest.fn().mockResolvedValue(Buffer.from('img')),
  };
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'APP_TIMEZONE') return 'America/Sao_Paulo';
      if (key === 'FRONTEND_APP_URL') return 'http://localhost:4200';
      return undefined;
    }),
  };

  const baseSettings = (): MembershipCardSettings => {
    const settings = new MembershipCardSettings();
    settings.id = 'ssssssss-ssss-ssss-ssss-ssssssssssss';
    settings.congregationId = congregationId;
    settings.headerLine1 = 'Igreja Teste';
    settings.headerLine2 = null;
    settings.ministryLabel = null;
    settings.presidentName = 'Pastora Teste';
    settings.presidentTitle = 'PASTORA PRESIDENTE';
    settings.logoPath = null;
    settings.signaturePath = null;
    settings.validityMonths = 24;
    settings.footerNotice =
      'Válida somente com a apresentação de documento de identificação com foto';
    settings.createdAt = new Date('2026-07-21T00:00:00Z');
    settings.updatedAt = new Date('2026-07-21T00:00:00Z');
    return settings;
  };

  const baseMember = (overrides: Partial<Member> = {}): Member => {
    const member = new Member();
    member.id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    member.fullName = 'Maria da Silva';
    member.email = null;
    member.phone = null;
    member.document = '12345678900';
    member.birthDate = '1990-05-20';
    member.gender = MemberGender.FEMALE;
    member.maritalStatus = MemberMaritalStatus.MARRIED;
    member.status = MemberStatus.ACTIVE;
    member.baptismDate = null;
    member.membershipDate = null;
    member.address = null;
    member.city = 'São Paulo';
    member.state = 'SP';
    member.zipCode = null;
    member.notes = null;
    member.rg = '12.345.678-9';
    member.registrationNumber = '000001';
    member.placeOfBirth = 'Campinas / SP';
    member.bloodType = 'O+';
    member.fatherName = 'José da Silva';
    member.motherName = 'Ana da Silva';
    member.positionTitle = 'Diácono';
    member.photoPath = 'members/photos/aaaa.png';
    member.congregationId = congregationId;
    member.userId = null;
    member.createdAt = new Date('2026-07-21T00:00:00Z');
    member.updatedAt = new Date('2026-07-21T00:00:00Z');
    member.deletedAt = null;
    Object.assign(member, overrides);
    return member;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    congregationsService.getOrCreateBase.mockResolvedValue({
      id: congregationId,
      name: 'Igreja Teste',
    });
    congregationsService.getBase.mockResolvedValue({
      id: congregationId,
      name: 'Igreja Teste',
    });
    settingsRepository.findOne.mockResolvedValue(baseSettings());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipCardsService,
        {
          provide: getRepositoryToken(MembershipCardSettings),
          useValue: settingsRepository,
        },
        { provide: getRepositoryToken(Member), useValue: membersRepository },
        {
          provide: getRepositoryToken(FamilyMember),
          useValue: familyMembersRepository,
        },
        {
          provide: getRepositoryToken(MinistryMember),
          useValue: ministryMembersRepository,
        },
        { provide: CongregationsService, useValue: congregationsService },
        { provide: FileStorageService, useValue: fileStorageService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(MembershipCardsService);
  });

  describe('getOrCreateSettings', () => {
    it('cria settings lazy quando não existem', async () => {
      settingsRepository.findOne.mockResolvedValue(null);
      const created = baseSettings();
      settingsRepository.create.mockReturnValue(created);
      settingsRepository.save.mockResolvedValue(created);

      const result = await service.getOrCreateSettings(congregationId);

      expect(settingsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          congregationId,
          headerLine1: 'Igreja Teste',
          validityMonths: 24,
        }),
      );
      expect(result.headerLine1).toBe('Igreja Teste');
    });
  });

  describe('getCard', () => {
    it('monta filiação, naturalidade e validade', async () => {
      membersRepository.findOne.mockResolvedValue(baseMember());

      const card = await service.getCard(
        'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        congregationId,
      );

      expect(card.front.filiation).toBe('José da Silva\nAna da Silva');
      expect(card.front.placeOfBirth).toBe('Campinas / SP');
      expect(card.front.positionTitle).toBe('Diácono');
      expect(card.front.registrationNumber).toBe('000001');
      expect(card.front.photoDataUrl).toMatch(/^data:image\/png;base64,/);
      expect(card.back.cpf).toBe('12345678900');
      expect(card.back.verificationUrl).toContain(
        '/verify-membership-card/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      );
      expect(card.back.qrCodeDataUrl).toBe('data:image/png;base64,qr');
      expect(card.missingFields).toEqual([]);
      expect(card.validUntil).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('usa fallback de city/state e inclui warning para inativo', async () => {
      membersRepository.findOne.mockResolvedValue(
        baseMember({
          fatherName: null,
          motherName: null,
          placeOfBirth: null,
          positionTitle: null,
          photoPath: null,
          status: MemberStatus.INACTIVE,
        }),
      );
      familyMembersRepository.findOne.mockResolvedValue(null);
      ministryMembersRepository.findOne.mockResolvedValue(null);

      const card = await service.getCard(
        'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        congregationId,
      );

      expect(card.front.placeOfBirth).toBe('São Paulo / SP');
      expect(card.front.filiation).toBeNull();
      expect(card.warnings).toContain('inactive_member');
      expect(card.missingFields).toEqual(
        expect.arrayContaining(['photo', 'filiation', 'positionTitle']),
      );
    });

    it('isola por congregação (404 se outra)', async () => {
      membersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getCard(
          'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
          otherCongregationId,
        ),
      ).rejects.toBeInstanceOf(ApiException);
    });
  });

  describe('getCardsBatch', () => {
    it('rejeita lote acima de 50', async () => {
      const ids = Array.from(
        { length: 51 },
        (_, i) => `aaaaaaaa-bbbb-cccc-dddd-${String(i).padStart(12, '0')}`,
      );

      await expect(
        service.getCardsBatch(ids, congregationId),
      ).rejects.toBeInstanceOf(ApiException);
    });

    it('retorna cards na ordem dos IDs', async () => {
      const m1 = baseMember({ id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee1' });
      const m2 = baseMember({
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee2',
        fullName: 'João',
      });
      membersRepository.find.mockResolvedValue([m2, m1]);

      const cards = await service.getCardsBatch([m1.id, m2.id], congregationId);

      expect(cards.map((c) => c.memberId)).toEqual([m1.id, m2.id]);
    });
  });

  describe('uploadLogo', () => {
    it('salva logo e remove anterior', async () => {
      const settings = baseSettings();
      settings.logoPath = 'membership-cards/logos/old.png';
      settingsRepository.findOne.mockResolvedValue(settings);
      fileStorageService.saveImageAsset.mockResolvedValue({
        relativePath: 'membership-cards/logos/new.png',
        originalFilename: 'logo.png',
        mimeType: 'image/png',
        sizeBytes: 10,
      });
      settingsRepository.save.mockImplementation((s: MembershipCardSettings) =>
        Promise.resolve(s),
      );

      const file = {
        buffer: Buffer.from('x'),
        originalname: 'logo.png',
        mimetype: 'image/png',
        size: 1,
      };
      const result = await service.uploadLogo(file, congregationId);

      expect(result.logoUrl).toBe('/api/membership-cards/settings/logo');
      expect(result.logoDataUrl).toMatch(/^data:image\/png;base64,/);
      expect(fileStorageService.deleteIfExists).toHaveBeenCalledWith(
        'membership-cards/logos/old.png',
      );
    });
  });

  describe('removeLogo', () => {
    it('limpa logo_path e apaga arquivo', async () => {
      const settings = baseSettings();
      settings.logoPath = 'membership-cards/logos/current.png';
      settingsRepository.findOne.mockResolvedValue(settings);
      settingsRepository.save.mockImplementation((s: MembershipCardSettings) =>
        Promise.resolve(s),
      );

      const result = await service.removeLogo(congregationId);

      expect(result.logoUrl).toBeNull();
      expect(result.logoDataUrl).toBeNull();
      expect(fileStorageService.deleteIfExists).toHaveBeenCalledWith(
        'membership-cards/logos/current.png',
      );
    });
  });
});
