import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAssetDto, CreateFinancialEntryDto } from './finance.dto';
import {
  AssetType,
  FinancialType,
  PaymentMethod,
} from '../enums/finance.enums';

describe('Finance DTOs', () => {
  it('aceita somente data ISO sem horário nos lançamentos', async () => {
    const dto = plainToInstance(CreateFinancialEntryDto, {
      entryDate: '2026-07-17T10:00:00.000Z',
      type: FinancialType.INCOME,
      categoryId: 'd5157c7e-7618-4c7b-bfb3-e42e77878886',
      description: 'Oferta',
      amount: 10,
      paymentMethod: PaymentMethod.PIX,
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'entryDate')).toBe(true);
  });

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
