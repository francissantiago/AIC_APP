import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ReadStream } from 'fs';
import { Repository } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { FileStorageService } from '../secretariat/storage/file-storage.service';
import { UploadedFile } from '../secretariat/storage/uploaded-file.interface';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { ConstructionProjectsService } from './construction-projects.service';
import { ConstructionUpdatesService } from './construction-updates.service';
import { CreateConstructionPhotoDto } from './dto/create-construction-photo.dto';
import {
  ConstructionPhotoResponseDto,
  PaginatedConstructionPhotosResponseDto,
} from './dto/construction-photo-response.dto';
import { ConstructionPhoto } from './entities/construction-photo.entity';

const CONSTRUCTIONS_PHOTOS_SUBDIR = 'constructions';
const MAX_PHOTOS_PER_PROJECT = 20;

@Injectable()
export class ConstructionPhotosService {
  private readonly logger = new Logger(ConstructionPhotosService.name);

  constructor(
    @InjectRepository(ConstructionPhoto)
    private readonly photosRepository: Repository<ConstructionPhoto>,
    private readonly fileStorageService: FileStorageService,
    private readonly constructionProjectsService: ConstructionProjectsService,
    private readonly constructionUpdatesService: ConstructionUpdatesService,
  ) {}

  async upload(
    projectId: string,
    file: UploadedFile | undefined,
    dto: CreateConstructionPhotoDto,
    user: UserResponseDto,
    activeCongregationId?: string,
  ): Promise<ConstructionPhotoResponseDto> {
    const congregationId =
      await this.constructionProjectsService.getCongregationId(
        activeCongregationId,
      );
    await this.constructionProjectsService.getProjectOrFailInternal(
      projectId,
      congregationId,
    );

    if (dto.constructionUpdateId) {
      const update =
        await this.constructionUpdatesService.getUpdateOrFailInternal(
          dto.constructionUpdateId,
          congregationId,
        );
      if (update.constructionProjectId !== projectId) {
        throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
          code: ApiErrorCode.CONSTRUCTIONS_UPDATE_WRONG_PROJECT,
          message:
            ApiErrorMessage[ApiErrorCode.CONSTRUCTIONS_UPDATE_WRONG_PROJECT],
        });
      }
    }

    const currentCount = await this.photosRepository.count({
      where: { constructionProjectId: projectId, congregationId },
    });
    if (currentCount >= MAX_PHOTOS_PER_PROJECT) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.CONSTRUCTIONS_PHOTOS_LIMIT_REACHED,
        message:
          ApiErrorMessage[ApiErrorCode.CONSTRUCTIONS_PHOTOS_LIMIT_REACHED],
      });
    }

    const savedFile = await this.fileStorageService.saveImageAsset(
      CONSTRUCTIONS_PHOTOS_SUBDIR,
      projectId,
      file as UploadedFile,
    );

    const photo = this.photosRepository.create({
      congregationId,
      constructionProjectId: projectId,
      constructionUpdateId: dto.constructionUpdateId ?? null,
      uploadedByUserId: user.id,
      filePath: savedFile.relativePath,
      originalFilename: savedFile.originalFilename,
      mimeType: savedFile.mimeType,
      sizeBytes: savedFile.sizeBytes,
      caption: this.nullableText(dto.caption),
    });
    const saved = await this.photosRepository.save(photo);

    this.logger.log(`Foto de obra enviada: ${saved.id}`);
    return ConstructionPhotoResponseDto.fromEntity(
      saved,
      this.buildContentUrl(saved.id),
    );
  }

  async findAll(
    projectId: string,
    page: number,
    limit: number,
    activeCongregationId?: string,
  ): Promise<PaginatedConstructionPhotosResponseDto> {
    const congregationId =
      await this.constructionProjectsService.getCongregationId(
        activeCongregationId,
      );
    await this.constructionProjectsService.getProjectOrFailInternal(
      projectId,
      congregationId,
    );

    const [photos, total] = await this.photosRepository.findAndCount({
      where: { constructionProjectId: projectId, congregationId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: photos.map((photo) =>
        ConstructionPhotoResponseDto.fromEntity(
          photo,
          this.buildContentUrl(photo.id),
        ),
      ),
      total,
      page,
      limit,
    };
  }

  async getContent(
    photoId: string,
    activeCongregationId?: string,
  ): Promise<{ stream: ReadStream; mimeType: string }> {
    const photo = await this.getPhotoOrFail(photoId, activeCongregationId);
    const opened = await this.fileStorageService.openReadStream(photo.filePath);
    return { stream: opened.stream, mimeType: photo.mimeType };
  }

  async remove(photoId: string, activeCongregationId?: string): Promise<void> {
    const photo = await this.getPhotoOrFail(photoId, activeCongregationId);
    const filePath = photo.filePath;
    await this.photosRepository.softRemove(photo);
    await this.fileStorageService.deleteIfExists(filePath);
    this.logger.log(`Foto de obra removida: ${photoId}`);
  }

  private async getPhotoOrFail(
    photoId: string,
    activeCongregationId?: string,
  ): Promise<ConstructionPhoto> {
    const congregationId =
      await this.constructionProjectsService.getCongregationId(
        activeCongregationId,
      );
    const photo = await this.photosRepository.findOne({
      where: { id: photoId, congregationId },
    });
    if (!photo) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.CONSTRUCTIONS_PHOTO_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.CONSTRUCTIONS_PHOTO_NOT_FOUND],
      });
    }
    return photo;
  }

  private buildContentUrl(photoId: string): string {
    return `/api/construction-photos/${photoId}/content`;
  }

  private nullableText(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
