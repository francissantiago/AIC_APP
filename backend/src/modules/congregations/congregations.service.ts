import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CongregationResponseDto } from './dto/congregation-response.dto';
import { UpdateCongregationDto } from './dto/update-congregation.dto';
import { Congregation } from './entities/congregation.entity';
import { CongregationStatus } from './enums/congregation-status.enum';
import { CongregationType } from './enums/congregation-type.enum';

@Injectable()
export class CongregationsService {
  private readonly logger = new Logger(CongregationsService.name);

  constructor(
    @InjectRepository(Congregation)
    private readonly congregationsRepository: Repository<Congregation>,
  ) {}

  async getOrCreateBase(): Promise<Congregation> {
    const active = await this.congregationsRepository.find({
      order: { createdAt: 'ASC', id: 'ASC' },
    });

    if (active.length === 0) {
      const created = this.congregationsRepository.create({
        name: 'Congregação',
        type: CongregationType.HEADQUARTERS,
        status: CongregationStatus.ACTIVE,
      });
      const saved = await this.congregationsRepository.save(created);
      this.logger.log(`Congregação-base criada: ${saved.id}`);
      return saved;
    }

    if (active.length > 1) {
      const [base, ...extras] = active;
      this.logger.warn(
        `Estado inconsistente: ${active.length} congregações ativas; mantendo ${base.id} e soft-deletando as demais`,
      );
      await this.congregationsRepository.softRemove(extras);
      return base;
    }

    return active[0];
  }

  async getBase(): Promise<CongregationResponseDto> {
    const congregation = await this.getOrCreateBase();
    return CongregationResponseDto.fromEntity(congregation);
  }

  async updateBase(
    dto: UpdateCongregationDto,
  ): Promise<CongregationResponseDto> {
    const congregation = await this.getOrCreateBase();

    if (dto.email !== undefined && dto.email !== congregation.email) {
      await this.assertEmailDocumentUniqueness(
        dto.email,
        undefined,
        congregation.id,
      );
      congregation.email = dto.email ?? null;
    }
    if (dto.document !== undefined && dto.document !== congregation.document) {
      await this.assertEmailDocumentUniqueness(
        undefined,
        dto.document,
        congregation.id,
      );
      congregation.document = dto.document ?? null;
    }

    if (dto.name !== undefined) {
      congregation.name = dto.name;
    }
    if (dto.tradeName !== undefined) {
      congregation.tradeName = dto.tradeName ?? null;
    }
    if (dto.type !== undefined) {
      congregation.type = dto.type;
    }
    if (dto.phone !== undefined) {
      congregation.phone = dto.phone ?? null;
    }
    if (dto.address !== undefined) {
      congregation.address = dto.address ?? null;
    }
    if (dto.city !== undefined) {
      congregation.city = dto.city ?? null;
    }
    if (dto.state !== undefined) {
      congregation.state = dto.state ?? null;
    }
    if (dto.zipCode !== undefined) {
      congregation.zipCode = dto.zipCode ?? null;
    }
    if (dto.foundationDate !== undefined) {
      congregation.foundationDate = dto.foundationDate ?? null;
    }
    if (dto.website !== undefined) {
      congregation.website = dto.website ?? null;
    }
    if (dto.status !== undefined) {
      congregation.status = dto.status;
    }
    if (dto.notes !== undefined) {
      congregation.notes = dto.notes ?? null;
    }

    const saved = await this.congregationsRepository.save(congregation);
    this.logger.log(`Congregação-base atualizada: ${saved.id}`);
    return CongregationResponseDto.fromEntity(saved);
  }

  private async assertEmailDocumentUniqueness(
    email?: string,
    document?: string,
    excludeId?: string,
  ): Promise<void> {
    if (email) {
      const conflict = await this.congregationsRepository.findOne({
        where: { email },
        withDeleted: true,
      });
      if (conflict && conflict.id !== excludeId) {
        throw new ConflictException('email já está em uso');
      }
    }
    if (document) {
      const conflict = await this.congregationsRepository.findOne({
        where: { document },
        withDeleted: true,
      });
      if (conflict && conflict.id !== excludeId) {
        throw new ConflictException('document já está em uso');
      }
    }
  }
}
