import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ApiException } from '../../../common/errors/api.exception';
import { ApiErrorCode } from '../../../common/errors/api-error.types';
import { CongregationsService } from '../../congregations/congregations.service';
import { Congregation } from '../../congregations/entities/congregation.entity';
import { CongregationStatus } from '../../congregations/enums/congregation-status.enum';
import { CongregationType } from '../../congregations/enums/congregation-type.enum';
import { Member } from '../../members/entities/member.entity';
import { MemberGender } from '../../members/enums/member-gender.enum';
import { MemberMaritalStatus } from '../../members/enums/member-marital-status.enum';
import { MemberStatus } from '../../members/enums/member-status.enum';
import { MembersService } from '../../members/members.service';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { Visitor } from './entities/visitor.entity';
import { VisitorsService } from './visitors.service';

describe('VisitorsService', () => {
  let service: VisitorsService;

  const congregationId = 'cccccccc-dddd-eeee-ffff-000000000001';
  const visitorId = 'vvvvvvvv-wwww-xxxx-yyyy-zzzzzzzzzzzz';
  const memberId = 'mmmmmmmm-nnnn-oooo-pppp-qqqqqqqqqqqq';

  const visitorsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    softRemove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const congregationsService = {
    getOrCreateBase: jest.fn(),
  };

  const membersService = {
    createInTransaction: jest.fn(),
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

  const baseVisitor = (): Visitor => {
    const visitor = new Visitor();
    visitor.id = visitorId;
    visitor.congregationId = congregationId;
    visitor.createdByUserId = 'uuuuuuuu-vvvv-wwww-xxxx-yyyyyyyyyyyy';
    visitor.fullName = 'João Visitante';
    visitor.phone = '+5511987654321';
    visitor.visitDate = '2026-07-10';
    visitor.notes = 'Primeira visita';
    visitor.followUpDone = false;
    visitor.memberId = null;
    visitor.createdAt = new Date('2026-07-10T00:00:00Z');
    visitor.updatedAt = new Date('2026-07-10T00:00:00Z');
    visitor.deletedAt = null;
    return visitor;
  };

  const baseMember = (): Member => {
    const member = new Member();
    member.id = memberId;
    member.fullName = 'João Visitante';
    member.email = null;
    member.phone = '+5511987654321';
    member.document = null;
    member.birthDate = null;
    member.gender = MemberGender.UNSPECIFIED;
    member.maritalStatus = MemberMaritalStatus.OTHER;
    member.status = MemberStatus.ACTIVE;
    member.baptismDate = null;
    member.membershipDate = '2026-07-18';
    member.address = null;
    member.city = null;
    member.state = null;
    member.zipCode = null;
    member.notes = '[Visitante 2026-07-10] Primeira visita';
    member.congregationId = congregationId;
    member.userId = null;
    member.createdAt = new Date('2026-07-18T00:00:00Z');
    member.updatedAt = new Date('2026-07-18T00:00:00Z');
    member.deletedAt = null;
    return member;
  };

  const userWithPermissions = (): UserResponseDto =>
    ({
      id: 'uuuuuuuu-vvvv-wwww-xxxx-yyyyyyyyyyyy',
      permissions: ['secretariat:write', 'members:write'],
    }) as UserResponseDto;

  const userWithoutMembersWrite = (): UserResponseDto =>
    ({
      id: 'uuuuuuuu-vvvv-wwww-xxxx-yyyyyyyyyyyy',
      permissions: ['secretariat:write'],
    }) as UserResponseDto;

  beforeEach(async () => {
    jest.clearAllMocks();
    congregationsService.getOrCreateBase.mockResolvedValue(baseCongregation());

    dataSource.transaction.mockImplementation(
      async (callback: (manager: unknown) => Promise<unknown>) => {
        const manager = {
          findOne: jest.fn(),
          save: jest.fn(),
        };
        return callback(manager);
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitorsService,
        { provide: getRepositoryToken(Visitor), useValue: visitorsRepository },
        { provide: CongregationsService, useValue: congregationsService },
        { provide: MembersService, useValue: membersService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(VisitorsService);
  });

  it('converte visitante em membro com sucesso', async () => {
    const visitor = baseVisitor();
    const member = baseMember();

    dataSource.transaction.mockImplementationOnce(
      async (callback: (manager: unknown) => Promise<unknown>) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue(visitor),
          save: jest.fn().mockImplementation((entity: Visitor) =>
            Promise.resolve({
              ...entity,
              memberId: member.id,
              followUpDone: true,
            }),
          ),
        };
        membersService.createInTransaction.mockResolvedValue(member);
        return callback(manager);
      },
    );

    const result = await service.convertToMember(
      visitorId,
      {},
      userWithPermissions(),
    );

    expect(result.member.id).toBe(memberId);
    expect(result.visitor.memberId).toBe(memberId);
    expect(result.visitor.followUpDone).toBe(true);
    expect(membersService.createInTransaction).toHaveBeenCalled();
  });

  it('rejeita conversão quando visitante já foi integrado', async () => {
    const visitor = baseVisitor();
    visitor.memberId = memberId;

    dataSource.transaction.mockImplementationOnce(
      async (callback: (manager: unknown) => Promise<unknown>) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue(visitor),
          save: jest.fn(),
        };
        return callback(manager);
      },
    );

    await expect(
      service.convertToMember(visitorId, {}, userWithPermissions()),
    ).rejects.toMatchObject({
      response: {
        code: ApiErrorCode.SECRETARIAT_VISITOR_ALREADY_CONVERTED,
      },
      status: HttpStatus.CONFLICT,
    });
  });

  it('rejeita conversão quando visitante não existe', async () => {
    dataSource.transaction.mockImplementationOnce(
      async (callback: (manager: unknown) => Promise<unknown>) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue(null),
          save: jest.fn(),
        };
        return callback(manager);
      },
    );

    await expect(
      service.convertToMember(visitorId, {}, userWithPermissions()),
    ).rejects.toMatchObject({
      response: {
        code: ApiErrorCode.SECRETARIAT_VISITOR_NOT_FOUND,
      },
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('rejeita conversão quando usuário não tem members:write', async () => {
    await expect(
      service.convertToMember(visitorId, {}, userWithoutMembersWrite()),
    ).rejects.toBeInstanceOf(ApiException);

    await expect(
      service.convertToMember(visitorId, {}, userWithoutMembersWrite()),
    ).rejects.toMatchObject({
      status: HttpStatus.FORBIDDEN,
    });

    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('propaga conflito de e-mail duplicado do MembersService', async () => {
    const visitor = baseVisitor();

    dataSource.transaction.mockImplementationOnce(
      async (callback: (manager: unknown) => Promise<unknown>) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue(visitor),
          save: jest.fn(),
        };
        membersService.createInTransaction.mockRejectedValue(
          new ApiException(HttpStatus.CONFLICT, {
            code: ApiErrorCode.MEMBERS_EMAIL_IN_USE,
            message: 'Este e-mail já está cadastrado.',
          }),
        );
        return callback(manager);
      },
    );

    await expect(
      service.convertToMember(
        visitorId,
        { email: 'duplicado@igreja.org' },
        userWithPermissions(),
      ),
    ).rejects.toMatchObject({
      response: { code: ApiErrorCode.MEMBERS_EMAIL_IN_USE },
      status: HttpStatus.CONFLICT,
    });
  });

  it('convertToMember repassa congregationId explícito para createInTransaction', async () => {
    const explicitId = '22222222-3333-4444-5555-666666666666';
    const visitor = baseVisitor();
    const member = baseMember();

    dataSource.transaction.mockImplementationOnce(
      async (callback: (manager: unknown) => Promise<unknown>) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue(visitor),
          save: jest
            .fn()
            .mockImplementation((entity) =>
              Promise.resolve({ ...entity, id: visitor.id }),
            ),
        };
        membersService.createInTransaction.mockResolvedValue(member);
        return callback(manager);
      },
    );
    jest.clearAllMocks();
    congregationsService.getOrCreateBase.mockResolvedValue(baseCongregation());

    await service.convertToMember(
      visitorId,
      {},
      userWithPermissions(),
      explicitId,
    );

    expect(congregationsService.getOrCreateBase).not.toHaveBeenCalled();
    expect(membersService.createInTransaction).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      explicitId,
    );
  });
});
