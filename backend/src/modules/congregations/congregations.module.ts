import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { CongregationBranchesController } from './congregation-branches.controller';
import { CongregationsController } from './congregations.controller';
import { CongregationsService } from './congregations.service';
import { Congregation } from './entities/congregation.entity';
import { UserCongregation } from './entities/user-congregation.entity';
import { CongregationContextGuard } from './guards/congregation-context.guard';
import { MeCongregationsController } from './me-congregations.controller';
import { UserCongregationsController } from './user-congregations.controller';
import { UserCongregationsService } from './user-congregations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Congregation, UserCongregation]),
    UsersModule,
  ],
  controllers: [
    CongregationsController,
    CongregationBranchesController,
    MeCongregationsController,
    UserCongregationsController,
  ],
  providers: [
    CongregationsService,
    UserCongregationsService,
    CongregationContextGuard,
  ],
  exports: [
    CongregationsService,
    UserCongregationsService,
    CongregationContextGuard,
  ],
})
export class CongregationsModule {}
