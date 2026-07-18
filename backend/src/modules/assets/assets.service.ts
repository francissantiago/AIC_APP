import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  QueryFailedError,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { CongregationsService } from '../congregations/congregations.service';
import { UserResponseDto } from '../users/dto/user-response.dto';
import {
  AssetDashboardTotalsDto,
  AssetReportResponseDto,
  AssetResponseDto,
  CreateAssetDto,
  PaginatedAssetsResponseDto,
  QueryAssetsDto,
  UpdateAssetDto,
} from './dto/assets.dto';
import { Asset } from './entities/asset.entity';

type AssetTotalRow = { quantity: string; estimatedValue: string | null };
type AssetDashboardRow = {
  activeAssets: string;
  estimatedValue: string | null;
};

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    @InjectRepository(Asset)
    private readonly assetsRepository: Repository<Asset>,
    private readonly congregationsService: CongregationsService,
  ) {}

  async createAsset(
    dto: CreateAssetDto,
    user: UserResponseDto,
  ): Promise<AssetResponseDto> {
    const congregationId = await this.getCongregationId();
    const asset = this.assetsRepository.create({
      congregationId,
      createdByUserId: user.id,
      assetTag: this.nullableText(dto.assetTag),
      name: dto.name.trim(),
      type: dto.type,
      acquisitionDate: dto.acquisitionDate ?? null,
      acquisitionValue:
        dto.acquisitionValue == null ? null : this.money(dto.acquisitionValue),
      currentValue:
        dto.currentValue == null ? null : this.money(dto.currentValue),
      location: this.nullableText(dto.location),
      status: dto.status,
      notes: this.nullableText(dto.notes),
    });
    try {
      return this.toAssetDto(await this.assetsRepository.save(asset));
    } catch (error) {
      this.rethrowAssetDuplicate(error);
    }
  }

  async findAssets(query: QueryAssetsDto): Promise<PaginatedAssetsResponseDto> {
    const congregationId = await this.getCongregationId();
    const qb = this.assetsRepository
      .createQueryBuilder('asset')
      .where('asset.congregationId = :congregationId', { congregationId });
    this.applyAssetFilters(qb, query);
    qb.orderBy('asset.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    const [assets, total] = await qb.getManyAndCount();
    return {
      data: assets.map(this.toAssetDto),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async findAsset(id: string): Promise<AssetResponseDto> {
    const congregationId = await this.getCongregationId();
    return this.toAssetDto(await this.getAssetOrFail(id, congregationId));
  }

  async updateAsset(
    id: string,
    dto: UpdateAssetDto,
  ): Promise<AssetResponseDto> {
    const congregationId = await this.getCongregationId();
    const asset = await this.getAssetOrFail(id, congregationId);
    if (dto.assetTag !== undefined)
      asset.assetTag = this.nullableText(dto.assetTag);
    if (dto.name !== undefined) asset.name = dto.name.trim();
    if (dto.type !== undefined) asset.type = dto.type;
    if (dto.acquisitionDate !== undefined) {
      asset.acquisitionDate = dto.acquisitionDate;
    }
    if (dto.acquisitionValue !== undefined) {
      asset.acquisitionValue =
        dto.acquisitionValue == null ? null : this.money(dto.acquisitionValue);
    }
    if (dto.currentValue !== undefined) {
      asset.currentValue =
        dto.currentValue == null ? null : this.money(dto.currentValue);
    }
    if (dto.location !== undefined) {
      asset.location = this.nullableText(dto.location);
    }
    if (dto.status !== undefined) asset.status = dto.status;
    if (dto.notes !== undefined) asset.notes = this.nullableText(dto.notes);
    try {
      return this.toAssetDto(await this.assetsRepository.save(asset));
    } catch (error) {
      this.rethrowAssetDuplicate(error);
    }
  }

  async removeAsset(id: string): Promise<void> {
    const congregationId = await this.getCongregationId();
    await this.assetsRepository.softRemove(
      await this.getAssetOrFail(id, congregationId),
    );
    this.logger.log(`Bem removido (soft delete): ${id}`);
  }

  async getAssetReport(query: QueryAssetsDto): Promise<AssetReportResponseDto> {
    const congregationId = await this.getCongregationId();
    const [assets, totals] = await Promise.all([
      this.findAssets(query),
      this.getAssetTotals(congregationId, query),
    ]);
    return {
      ...assets,
      quantity: Number(totals.quantity),
      estimatedValue: this.money(totals.estimatedValue),
    };
  }

  async getDashboardTotals(
    congregationId: string,
  ): Promise<AssetDashboardTotalsDto> {
    const assetTotals = await this.assetsRepository
      .createQueryBuilder('asset')
      .select(
        "SUM(CASE WHEN asset.status = 'active' THEN 1 ELSE 0 END)",
        'activeAssets',
      )
      .addSelect(
        'SUM(COALESCE(asset.currentValue, asset.acquisitionValue, 0))',
        'estimatedValue',
      )
      .where('asset.congregationId = :congregationId', { congregationId })
      .getRawOne<AssetDashboardRow>()
      .then((row) => row ?? { activeAssets: '0', estimatedValue: '0' });
    return {
      activeAssets: Number(assetTotals.activeAssets),
      estimatedAssetValue: this.money(assetTotals.estimatedValue),
    };
  }

  private async getCongregationId(): Promise<string> {
    return (await this.congregationsService.getOrCreateBase()).id;
  }

  private async getAssetOrFail(
    id: string,
    congregationId: string,
  ): Promise<Asset> {
    const asset = await this.assetsRepository.findOne({
      where: { id, congregationId },
    });
    if (!asset) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.ASSETS_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.ASSETS_NOT_FOUND],
      });
    }
    return asset;
  }

  private applyAssetFilters(
    qb: SelectQueryBuilder<Asset>,
    query: QueryAssetsDto,
  ): void {
    if (query.type) qb.andWhere('asset.type = :type', { type: query.type });
    if (query.status)
      qb.andWhere('asset.status = :status', { status: query.status });
    if (query.q) {
      qb.andWhere(
        new Brackets((nested) => {
          nested
            .where('asset.name LIKE :q', { q: `%${query.q}%` })
            .orWhere('asset.assetTag LIKE :q', { q: `%${query.q}%` })
            .orWhere('asset.location LIKE :q', { q: `%${query.q}%` });
        }),
      );
    }
  }

  private async getAssetTotals(
    congregationId: string,
    query: QueryAssetsDto,
  ): Promise<AssetTotalRow> {
    const qb = this.assetsRepository
      .createQueryBuilder('asset')
      .select('COUNT(asset.id)', 'quantity')
      .addSelect(
        'SUM(COALESCE(asset.currentValue, asset.acquisitionValue, 0))',
        'estimatedValue',
      )
      .where('asset.congregationId = :congregationId', { congregationId });
    this.applyAssetFilters(qb, query);
    return qb
      .getRawOne<AssetTotalRow>()
      .then((row) => row ?? { quantity: '0', estimatedValue: '0' });
  }

  private money(value: bigint | number | string | null | undefined): string {
    const cents = typeof value === 'bigint' ? value : this.toCents(value);
    const absolute = cents < 0n ? -cents : cents;
    const integer = absolute / 100n;
    const fraction = (absolute % 100n).toString().padStart(2, '0');
    return `${cents < 0n ? '-' : ''}${integer.toString()}.${fraction}`;
  }

  private toCents(value: number | string | null | undefined): bigint {
    if (value == null) return 0n;
    const normalized =
      typeof value === 'number' ? value.toFixed(2) : value.trim();
    const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
    if (!match) {
      throw new Error(`Valor monetário inválido: ${normalized}`);
    }
    const fraction = (match[3] ?? '').padEnd(2, '0');
    const cents = BigInt(match[2]) * 100n + BigInt(fraction);
    return match[1] === '-' ? -cents : cents;
  }

  private nullableText(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private readonly toAssetDto = (asset: Asset): AssetResponseDto => ({
    id: asset.id,
    createdByUserId: asset.createdByUserId,
    assetTag: asset.assetTag,
    name: asset.name,
    type: asset.type,
    acquisitionDate: asset.acquisitionDate,
    acquisitionValue:
      asset.acquisitionValue == null
        ? null
        : this.money(asset.acquisitionValue),
    currentValue:
      asset.currentValue == null ? null : this.money(asset.currentValue),
    location: asset.location,
    status: asset.status,
    notes: asset.notes,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  });

  private isDuplicate(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code === 'ER_DUP_ENTRY'
    );
  }

  private rethrowAssetDuplicate(error: unknown): never {
    if (this.isDuplicate(error)) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.ASSETS_DUPLICATE,
        message: ApiErrorMessage[ApiErrorCode.ASSETS_DUPLICATE],
      });
    }
    throw error;
  }
}
