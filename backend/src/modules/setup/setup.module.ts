import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CongregationsModule } from '../congregations/congregations.module';
import { User } from '../users/entities/user.entity';
import { SetupController } from './setup.controller';
import { SetupService } from './setup.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), CongregationsModule],
  controllers: [SetupController],
  providers: [SetupService],
})
export class SetupModule {}
