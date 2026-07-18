import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ReadStream } from 'fs';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../../common/errors/api-error.types';
import { ApiException } from '../../../common/errors/api.exception';
import { CongregationsService } from '../../congregations/congregations.service';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import {
  CreateSecretariatDocumentDto,
  PaginatedSecretariatDocumentsResponseDto,
  QuerySecretariatDocumentsDto,
  SecretariatDocumentResponseDto,
  UpdateSecretariatDocumentDto,
} from '../dto/secretariat.dto';
import { FileStorageService } from '../storage/file-storage.service';
import { UploadedFile } from '../storage/uploaded-file.interface';
import { SecretariatDocument } from './entities/secretariat-document.entity';

export type DocumentFileDownload = {
  stream: ReadStream;
  mimeType: string;
  originalFilename: string;
  sizeBytes: number;
};

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(SecretariatDocument)
    private readonly documentsRepository: Repository<SecretariatDocument>,
    private readonly congregationsService: CongregationsService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async createDocument(
    dto: CreateSecretariatDocumentDto,
    user: UserResponseDto,
  ): Promise<SecretariatDocumentResponseDto> {
    const congregationId = await this.getCongregationId();
    const document = this.documentsRepository.create({
      congregationId,
      createdByUserId: user.id,
      title: dto.title.trim(),
      type: dto.type,
      documentDate: dto.documentDate,
      summary: this.nullableText(dto.summary),
      status: dto.status,
    });
    const saved = await this.documentsRepository.save(document);
    this.logger.log(`Documento de secretaria criado: ${saved.id}`);
    return this.toDto(saved);
  }

  async findDocuments(
    query: QuerySecretariatDocumentsDto,
  ): Promise<PaginatedSecretariatDocumentsResponseDto> {
    const congregationId = await this.getCongregationId();
    const qb = this.documentsRepository
      .createQueryBuilder('document')
      .where('document.congregationId = :congregationId', { congregationId });
    this.applyFilters(qb, query);
    qb.orderBy('document.documentDate', 'DESC')
      .addOrderBy('document.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    const [documents, total] = await qb.getManyAndCount();
    return {
      data: documents.map(this.toDto),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async findDocument(id: string): Promise<SecretariatDocumentResponseDto> {
    const congregationId = await this.getCongregationId();
    return this.toDto(await this.getDocumentOrFail(id, congregationId));
  }

  async updateDocument(
    id: string,
    dto: UpdateSecretariatDocumentDto,
  ): Promise<SecretariatDocumentResponseDto> {
    const congregationId = await this.getCongregationId();
    const document = await this.getDocumentOrFail(id, congregationId);
    if (dto.title !== undefined) document.title = dto.title.trim();
    if (dto.type !== undefined) document.type = dto.type;
    if (dto.documentDate !== undefined) {
      document.documentDate = dto.documentDate;
    }
    if (dto.summary !== undefined) {
      document.summary = this.nullableText(dto.summary);
    }
    if (dto.status !== undefined) document.status = dto.status;
    const saved = await this.documentsRepository.save(document);
    this.logger.log(`Documento de secretaria atualizado: ${saved.id}`);
    return this.toDto(saved);
  }

  async removeDocument(id: string): Promise<void> {
    const congregationId = await this.getCongregationId();
    await this.documentsRepository.softRemove(
      await this.getDocumentOrFail(id, congregationId),
    );
    this.logger.log(`Documento de secretaria removido (soft delete): ${id}`);
  }

  async uploadFile(
    id: string,
    file: UploadedFile | undefined,
  ): Promise<SecretariatDocumentResponseDto> {
    const congregationId = await this.getCongregationId();
    const document = await this.getDocumentOrFail(id, congregationId);
    const previousPath = document.filePath;

    if (!file) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_REQUIRED,
        message:
          ApiErrorMessage[ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_REQUIRED],
      });
    }

    const savedFile = await this.fileStorageService.saveSecretariatDocument(
      document.id,
      file,
    );

    document.filePath = savedFile.relativePath;
    document.originalFilename = savedFile.originalFilename;
    document.mimeType = savedFile.mimeType;
    document.sizeBytes = savedFile.sizeBytes;

    const saved = await this.documentsRepository.save(document);

    if (previousPath && previousPath !== savedFile.relativePath) {
      await this.fileStorageService.deleteIfExists(previousPath);
    }

    this.logger.log(`Arquivo anexado ao documento ${saved.id}`);
    return this.toDto(saved);
  }

  async downloadFile(id: string): Promise<DocumentFileDownload> {
    const congregationId = await this.getCongregationId();
    const document = await this.getDocumentOrFail(id, congregationId);

    if (
      !document.filePath ||
      !document.originalFilename ||
      !document.mimeType ||
      document.sizeBytes == null
    ) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_NOT_FOUND,
        message:
          ApiErrorMessage[ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_NOT_FOUND],
      });
    }

    try {
      const { stream } = await this.fileStorageService.openReadStream(
        document.filePath,
      );
      return {
        stream,
        mimeType: document.mimeType,
        originalFilename: document.originalFilename,
        sizeBytes: document.sizeBytes,
      };
    } catch (error) {
      if (error instanceof ApiException) {
        this.logger.warn(
          `Arquivo ausente no disco para documento ${id}: ${document.filePath}`,
        );
        throw error;
      }
      throw error;
    }
  }

  async removeFile(id: string): Promise<void> {
    const congregationId = await this.getCongregationId();
    const document = await this.getDocumentOrFail(id, congregationId);

    if (!document.filePath) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_NOT_FOUND,
        message:
          ApiErrorMessage[ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_NOT_FOUND],
      });
    }

    const pathToDelete = document.filePath;
    document.filePath = null;
    document.originalFilename = null;
    document.mimeType = null;
    document.sizeBytes = null;
    await this.documentsRepository.save(document);
    await this.fileStorageService.deleteIfExists(pathToDelete);
    this.logger.log(`Anexo removido do documento ${id}`);
  }

  private async getCongregationId(): Promise<string> {
    return (await this.congregationsService.getOrCreateBase()).id;
  }

  private async getDocumentOrFail(
    id: string,
    congregationId: string,
  ): Promise<SecretariatDocument> {
    const document = await this.documentsRepository.findOne({
      where: { id, congregationId },
    });
    if (!document) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.SECRETARIAT_DOCUMENT_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.SECRETARIAT_DOCUMENT_NOT_FOUND],
      });
    }
    return document;
  }

  private applyFilters(
    qb: SelectQueryBuilder<SecretariatDocument>,
    query: QuerySecretariatDocumentsDto,
  ): void {
    if (query.type) qb.andWhere('document.type = :type', { type: query.type });
    if (query.status) {
      qb.andWhere('document.status = :status', { status: query.status });
    }
    if (query.from) {
      qb.andWhere('document.documentDate >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('document.documentDate <= :to', { to: query.to });
    }
    if (query.search) {
      qb.andWhere(
        new Brackets((nested) => {
          nested
            .where('document.title LIKE :search', {
              search: `%${query.search}%`,
            })
            .orWhere('document.summary LIKE :search', {
              search: `%${query.search}%`,
            });
        }),
      );
    }
  }

  private nullableText(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private readonly toDto = (
    document: SecretariatDocument,
  ): SecretariatDocumentResponseDto => ({
    id: document.id,
    congregationId: document.congregationId,
    createdByUserId: document.createdByUserId,
    title: document.title,
    type: document.type,
    documentDate: document.documentDate,
    summary: document.summary,
    status: document.status,
    hasAttachment: Boolean(document.filePath),
    originalFilename: document.originalFilename ?? null,
    mimeType: document.mimeType ?? null,
    sizeBytes: document.sizeBytes ?? null,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  });
}
