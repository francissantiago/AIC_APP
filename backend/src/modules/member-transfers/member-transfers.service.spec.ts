import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ApiErrorCode } from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { CongregationsService } from '../congregations/congregations.service';
import { Congregation } from '../congregations/entities/congregation.entity';
import { CongregationStatus } from '../congregations/enums/congregation-status.enum';
import { CongregationType } from '../congregations/enums/congregation-type.enum';
import { Member } from '../members/entities/member.entity';
import { MemberStatus } from '../members/enums/member-status.enum';
import { DocumentsService } from '../secretariat/documents/documents.service';
import { SecretariatDocument } from '../secretariat/documents/entities/secretariat-document.entity';
import {
  SecretariatDocumentStatus,
  SecretariatDocumentType,
} from '../secretariat/enums/secretariat.enums';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UserStatus } from '../users/enums/user-status.enum';
import { MemberTransfer } from './entities/member-transfer.entity';
import { MemberTransferStatus } from './enums/member-transfer-status.enum';
import { MemberTransfersService } from './member-transfers.service';

describe('MemberTransfersService', () => {
  let service: MemberTransfersService;

  const congregationId = 'cccccccc-dddd-eeee-ffff-000000000001';
  const memberId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const transferId = '11111111-2222-3333-4444-555555555555';
  const documentId = '99999999-8888-7777-6666-555555555555';
  const userId = 'user-1111-2222-3333-444444444444';

  const transfersRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    exists: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const membersRepository = {
    findOne: jest.fn(),
  };
  const congregationsService = {
    getOrCreateBase: jest.fn(),
  };
  const documentsService = {
    createDocument: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn(),
  };

  const baseCongregation = (): Congregation => {
    const congregation = new Congregation();
    congregation.id = congregationId;
    congregation.name = 'Congregação';
    congregation.type = CongregationType.HEADQUARTERS;
    congregation.status = CongregationStatus.ACTIVE;
    return congregation;
  };

  const baseUser = (): UserResponseDto => {
    const user = new UserResponseDto();
    user.id = userId;
    user.username = 'admin';
    user.email = 'admin@igreja.org';
    user.fullName = 'Admin';
    user.status = UserStatus.ACTIVE;
    user.twoFactorEnabled = false;
    user.lastLoginAt = null;
    user.createdAt = new Date();
    user.updatedAt = new Date();
    user.roles = [];
    return user;
  };

  const baseMember = (overrides?: Partial<Member>): Member => {
    const member = new Member();
    member.id = memberId;
    member.fullName = 'Maria da Silva';
    member.status = MemberStatus.ACTIVE;
    member.congregationId = congregationId;
    member.deletedAt = null;
    Object.assign(member, overrides);
    return member;
  };

  const baseDocument = (
    overrides?: Partial<SecretariatDocument>,
  ): SecretariatDocument => {
    const document = new SecretariatDocument();
    document.id = documentId;
    document.title = 'Carta de recomendação — Maria da Silva';
    document.type = SecretariatDocumentType.LETTER;
    document.status = SecretariatDocumentStatus.DRAFT;
    document.documentDate = '2026-07-18';
    document.summary = 'Membro: Maria da Silva';
    document.filePath = null;
    Object.assign(document, overrides);
    return document;
  };

  const baseTransfer = (
    overrides?: Partial<MemberTransfer>,
  ): MemberTransfer => {
    const transfer = new MemberTransfer();
    transfer.id = transferId;
    transfer.congregationId = congregationId;
    transfer.memberId = memberId;
    transfer.destinationChurchName = 'Igreja Destino';
    transfer.destinationCity = 'Campinas';
    transfer.requestedAt = new Date('2026-07-18T12:00:00Z');
    transfer.approvedAt = null;
    transfer.status = MemberTransferStatus.PENDING;
    transfer.documentId = documentId;
    transfer.notes = null;
    transfer.requestedByUserId = userId;
    transfer.createdAt = new Date('2026-07-18T12:00:00Z');
    transfer.updatedAt = new Date('2026-07-18T12:00:00Z');
    transfer.document = baseDocument();
    transfer.member = baseMember();
    Object.assign(transfer, overrides);
    return transfer;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    congregationsService.getOrCreateBase.mockResolvedValue(baseCongregation());
    dataSource.transaction.mockImplementation(
      async (cb: (manager: unknown) => Promise<unknown>) => {
        const manager = {
          create: jest
            .fn()
            .mockImplementation((_entity: unknown, data: unknown) => data),
          save: jest.fn().mockImplementation((entity: unknown) => {
            if (
              entity &&
              typeof entity === 'object' &&
              !(entity as { id?: string }).id
            ) {
              return Promise.resolve({ ...entity, id: transferId });
            }
            return Promise.resolve(entity);
          }),
          findOne: jest.fn().mockResolvedValue(baseDocument()),
        };
        return cb(manager);
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberTransfersService,
        {
          provide: getRepositoryToken(MemberTransfer),
          useValue: transfersRepository,
        },
        { provide: getRepositoryToken(Member), useValue: membersRepository },
        { provide: CongregationsService, useValue: congregationsService },
        { provide: DocumentsService, useValue: documentsService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(MemberTransfersService);
  });

  describe('create', () => {
    it('deve criar transferência pending com documentId', async () => {
      const member = baseMember();
      const transfer = baseTransfer();
      membersRepository.findOne.mockResolvedValue(member);
      transfersRepository.exists.mockResolvedValue(false);
      documentsService.createDocument.mockResolvedValue({
        id: documentId,
        title: 'Carta de recomendação — Maria da Silva',
        type: SecretariatDocumentType.LETTER,
        status: SecretariatDocumentStatus.DRAFT,
        documentDate: '2026-07-18',
        summary: 'Membro: Maria da Silva',
        hasFile: false,
      });
      transfersRepository.findOne.mockResolvedValue(transfer);

      const result = await service.create(
        memberId,
        {
          destinationChurchName: 'Igreja Destino',
          destinationCity: 'Campinas',
        },
        baseUser(),
      );

      expect(documentsService.createDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SecretariatDocumentType.LETTER,
          status: SecretariatDocumentStatus.DRAFT,
        }),
        expect.objectContaining({ id: userId }),
      );
      expect(result.status).toBe(MemberTransferStatus.PENDING);
      expect(result.documentId).toBe(documentId);
    });

    it('deve completar na mesma operação quando completeNow=true', async () => {
      const member = baseMember();
      const completed = baseTransfer({
        status: MemberTransferStatus.COMPLETED,
        approvedAt: new Date('2026-07-18T13:00:00Z'),
        member: baseMember({ status: MemberStatus.TRANSFERRED }),
        document: baseDocument({ status: SecretariatDocumentStatus.FINAL }),
      });
      membersRepository.findOne.mockResolvedValue(member);
      transfersRepository.exists.mockResolvedValue(false);
      documentsService.createDocument.mockResolvedValue({
        id: documentId,
      });
      transfersRepository.findOne.mockResolvedValue(completed);

      const result = await service.create(
        memberId,
        {
          destinationChurchName: 'Igreja Destino',
          destinationCity: 'Campinas',
          completeNow: true,
        },
        baseUser(),
      );

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(result.status).toBe(MemberTransferStatus.COMPLETED);
      expect(result.member?.status).toBe(MemberStatus.TRANSFERRED);
    });

    it('deve lançar 422 quando membro não está active', async () => {
      membersRepository.findOne.mockResolvedValue(
        baseMember({ status: MemberStatus.INACTIVE }),
      );

      try {
        await service.create(
          memberId,
          {
            destinationChurchName: 'Igreja Destino',
            destinationCity: 'Campinas',
          },
          baseUser(),
        );
        fail('esperava ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.MEMBERS_TRANSFER_MEMBER_NOT_ELIGIBLE,
        });
      }
    });

    it('deve lançar 409 quando já existe pending', async () => {
      membersRepository.findOne.mockResolvedValue(baseMember());
      transfersRepository.exists.mockResolvedValue(true);

      try {
        await service.create(
          memberId,
          {
            destinationChurchName: 'Igreja Destino',
            destinationCity: 'Campinas',
          },
          baseUser(),
        );
        fail('esperava ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.CONFLICT);
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.MEMBERS_TRANSFER_PENDING_EXISTS,
        });
      }
    });
  });

  describe('complete', () => {
    it('deve concluir pending e marcar membro transferred', async () => {
      const member = baseMember();
      const pending = baseTransfer();
      const completed = baseTransfer({
        status: MemberTransferStatus.COMPLETED,
        approvedAt: new Date('2026-07-18T13:00:00Z'),
        member: baseMember({ status: MemberStatus.TRANSFERRED }),
        document: baseDocument({ status: SecretariatDocumentStatus.FINAL }),
      });
      membersRepository.findOne.mockResolvedValue(member);
      transfersRepository.findOne
        .mockResolvedValueOnce(pending)
        .mockResolvedValueOnce(completed);

      const result = await service.complete(memberId, transferId);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(result.status).toBe(MemberTransferStatus.COMPLETED);
    });

    it('deve lançar 409 ao completar transferência já completed', async () => {
      membersRepository.findOne.mockResolvedValue(baseMember());
      transfersRepository.findOne.mockResolvedValue(
        baseTransfer({ status: MemberTransferStatus.COMPLETED }),
      );

      try {
        await service.complete(memberId, transferId);
        fail('esperava ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.CONFLICT);
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.MEMBERS_TRANSFER_INVALID_STATUS,
        });
      }
    });
  });

  describe('cancel', () => {
    it('deve cancelar pending sem alterar status do membro', async () => {
      const pending = baseTransfer();
      const cancelled = baseTransfer({
        status: MemberTransferStatus.CANCELLED,
      });
      membersRepository.findOne.mockResolvedValue(baseMember());
      transfersRepository.findOne
        .mockResolvedValueOnce(pending)
        .mockResolvedValueOnce(cancelled);
      transfersRepository.save.mockResolvedValue(cancelled);

      const result = await service.cancel(memberId, transferId);

      expect(transfersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: MemberTransferStatus.CANCELLED }),
      );
      expect(result.status).toBe(MemberTransferStatus.CANCELLED);
      expect(result.member?.status).toBe(MemberStatus.ACTIVE);
    });

    it('deve lançar 409 ao cancelar completed', async () => {
      membersRepository.findOne.mockResolvedValue(baseMember());
      transfersRepository.findOne.mockResolvedValue(
        baseTransfer({ status: MemberTransferStatus.COMPLETED }),
      );

      try {
        await service.cancel(memberId, transferId);
        fail('esperava ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.CONFLICT);
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.MEMBERS_TRANSFER_INVALID_STATUS,
        });
      }
    });
  });

  describe('findOne / listByMember', () => {
    it('deve lançar 404 para membro inexistente', async () => {
      membersRepository.findOne.mockResolvedValue(null);

      try {
        await service.listByMember(memberId);
        fail('esperava ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.MEMBERS_NOT_FOUND,
        });
      }
    });

    it('deve lançar 404 para transferência de outro membro', async () => {
      membersRepository.findOne.mockResolvedValue(baseMember());
      transfersRepository.findOne.mockResolvedValue(null);

      try {
        await service.findOne(memberId, transferId);
        fail('esperava ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.MEMBERS_TRANSFER_NOT_FOUND,
        });
      }
    });
  });
});
