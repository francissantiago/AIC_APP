import { Repository } from 'typeorm';
import { CongregationsService } from '../congregations/congregations.service';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { AssetsService } from './assets.service';
import { Asset } from './entities/asset.entity';

describe('AssetsService', () => {
  const getOrCreateBaseMock = jest
    .fn()
    .mockResolvedValue({ id: 'congregation-1' });
  const createQueryBuilder = jest.fn();
  const assetsRepository = {
    createQueryBuilder,
    create: jest.fn((value: object) => value),
    save: jest.fn(),
    findOne: jest.fn(),
  } as unknown as Repository<Asset>;
  const congregationsService = {
    getOrCreateBase: getOrCreateBaseMock,
  } as unknown as CongregationsService;
  const service = new AssetsService(assetsRepository, congregationsService);
  const user = { id: 'user-1' } as UserResponseDto;

  beforeEach(() => jest.clearAllMocks());

  it('findAssets com activeCongregationId não chama getOrCreateBase', async () => {
    const explicitId = '22222222-3333-4444-5555-666666666666';
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    createQueryBuilder.mockReturnValue(qb);
    getOrCreateBaseMock.mockResolvedValue({ id: 'congregation-1' });

    await service.findAssets({ page: 1, limit: 20 }, explicitId);

    expect(getOrCreateBaseMock).not.toHaveBeenCalled();
    expect(qb.where).toHaveBeenCalledWith(
      'asset.congregationId = :congregationId',
      {
        congregationId: explicitId,
      },
    );
  });

  it('createAsset sem activeCongregationId usa getOrCreateBase', async () => {
    assetsRepository.save = jest.fn().mockResolvedValue({
      id: 'asset-1',
      congregationId: 'congregation-1',
      name: 'Projetor',
      quantity: 1,
      estimatedValue: '1000.00',
      active: true,
      createdByUserId: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.createAsset({ name: 'Projetor', quantity: 1 }, user);

    expect(getOrCreateBaseMock).toHaveBeenCalled();
  });
});
