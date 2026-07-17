import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CongregationsModule } from '../congregations/congregations.module';
import { Asset } from './entities/asset.entity';
import { FinancialCategory } from './entities/financial-category.entity';
import { FinancialEntry } from './entities/financial-entry.entity';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([FinancialCategory, FinancialEntry, Asset]),
    AuthModule,
    CongregationsModule,
  ],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
