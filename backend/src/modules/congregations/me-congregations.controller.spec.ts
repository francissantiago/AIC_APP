import { Test, TestingModule } from '@nestjs/testing';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UserStatus } from '../users/enums/user-status.enum';
import { MeCongregationsController } from './me-congregations.controller';
import { UserCongregationsService } from './user-congregations.service';

describe('MeCongregationsController', () => {
  let controller: MeCongregationsController;

  const userCongregationsService = {
    listForUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeCongregationsController],
      providers: [
        {
          provide: UserCongregationsService,
          useValue: userCongregationsService,
        },
      ],
    }).compile();

    controller = module.get(MeCongregationsController);
  });

  it('deve delegar listagem ao service com id do usuário autenticado', async () => {
    const user = new UserResponseDto();
    user.id = 'user-1111-2222-3333-444444444444';
    user.username = 'admin';
    user.email = 'admin@igreja.org';
    user.fullName = 'Admin';
    user.status = UserStatus.ACTIVE;
    user.twoFactorEnabled = false;
    user.lastLoginAt = null;
    user.createdAt = new Date();
    user.updatedAt = new Date();
    user.roles = [];

    const response = [
      {
        congregationId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        congregationName: 'Congregação',
        congregationType: 'headquarters',
        isDefault: true,
        assignedAt: new Date(),
      },
    ];
    userCongregationsService.listForUser.mockResolvedValue(response);

    await expect(controller.findMine(user)).resolves.toEqual(response);
    expect(userCongregationsService.listForUser).toHaveBeenCalledWith(user.id);
  });
});
