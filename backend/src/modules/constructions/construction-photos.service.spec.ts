import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApiErrorCode } from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { FileStorageService } from '../secretariat/storage/file-storage.service';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { ConstructionPhotosService } from './construction-photos.service';
import { ConstructionProjectsService } from './construction-projects.service';
import { ConstructionUpdatesService } from './construction-updates.service';
import { ConstructionPhoto } from './entities/construction-photo.entity';

describe('ConstructionPhotosService', () => {
  let service: ConstructionPhotosService;

  const projectId = '11111111-2222-3333-4444-555555555555';
  const congregationId = 'cccccccc-dddd-eeee-ffff-000000000001';

  const photosRepository = {
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    softRemove: jest.fn(),
  };
  const fileStorageService = {
    saveImageAsset: jest.fn(),
    openReadStream: jest.fn(),
    deleteIfExists: jest.fn(),
  };
  const constructionProjectsService = {
    getCongregationId: jest.fn(),
    getProjectOrFailInternal: jest.fn(),
  };
  const constructionUpdatesService = {
    getUpdateOrFailInternal: jest.fn(),
  };

  const user = { id: 'user-1' } as UserResponseDto;

  beforeEach(async () => {
    jest.clearAllMocks();
    constructionProjectsService.getCongregationId.mockResolvedValue(
      congregationId,
    );
    constructionProjectsService.getProjectOrFailInternal.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConstructionPhotosService,
        {
          provide: getRepositoryToken(ConstructionPhoto),
          useValue: photosRepository,
        },
        { provide: FileStorageService, useValue: fileStorageService },
        {
          provide: ConstructionProjectsService,
          useValue: constructionProjectsService,
        },
        {
          provide: ConstructionUpdatesService,
          useValue: constructionUpdatesService,
        },
      ],
    }).compile();

    service = module.get(ConstructionPhotosService);
  });

  it('rejeita upload quando limite de 20 fotos foi atingido', async () => {
    photosRepository.count.mockResolvedValue(20);

    await expect(
      service.upload(
        projectId,
        {
          buffer: Buffer.from('img'),
          originalname: 'foto.jpg',
          mimetype: 'image/jpeg',
          size: 100,
        },
        {},
        user,
        congregationId,
      ),
    ).rejects.toBeInstanceOf(ApiException);

    try {
      await service.upload(projectId, undefined, {}, user, congregationId);
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ApiException);
      const apiError = error as ApiException;
      expect(apiError.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(apiError.getResponse()).toMatchObject({
        code: ApiErrorCode.CONSTRUCTIONS_PHOTOS_LIMIT_REACHED,
      });
    }
  });
});
