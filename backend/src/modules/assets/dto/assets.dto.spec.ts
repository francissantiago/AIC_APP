import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AssetType } from '../enums/asset.enums';
import { CreateAssetDto } from './assets.dto';

describe('Assets DTOs', () => {
  it('rejeita valores acima da capacidade de DECIMAL(13,2)', async () => {
    const dto = plainToInstance(CreateAssetDto, {
      name: 'Templo',
      type: AssetType.PROPERTY,
      acquisitionValue: 100_000_000_000,
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'acquisitionValue')).toBe(
      true,
    );
  });
});
