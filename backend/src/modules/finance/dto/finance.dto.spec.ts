import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FinancialType, PaymentMethod } from '../enums/finance.enums';
import { CreateFinancialEntryDto } from './finance.dto';

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
});
