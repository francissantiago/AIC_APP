import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { CongregationsService } from '../../congregations/congregations.service';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import {
  CreateSecretariatDocumentDto,
  PaginatedSecretariatDocumentsResponseDto,
  QuerySecretariatDocumentsDto,
  SecretariatDocumentResponseDto,
  UpdateSecretariatDocumentDto,
} from '../dto/secretariat.dto';
import { SecretariatDocument } from './entities/secretariat-document.entity';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(SecretariatDocument)
    private readonly documentsRepository: Repository<SecretariatDocument>,
    private readonly congregationsService: CongregationsService,
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
    if (!document)
      throw new NotFoundException(`Documento ${id} não encontrado`);
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
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  });
}
