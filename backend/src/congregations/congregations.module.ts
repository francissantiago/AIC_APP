import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CongregationsController } from './congregations.controller';
import { CongregationsService } from './congregations.service';
import { Congregation } from './entities/congregation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Congregation])],
  controllers: [CongregationsController],
  providers: [CongregationsService],
  exports: [CongregationsService],
})
export class CongregationsModule {}
