import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CongregationsModule } from '../congregations/congregations.module';
import { Member } from '../members/entities/member.entity';
import { MinistryMember } from './entities/ministry-member.entity';
import { Ministry } from './entities/ministry.entity';
import { MinistriesController } from './ministries.controller';
import { MinistriesService } from './ministries.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ministry, MinistryMember, Member]),
    CongregationsModule,
  ],
  controllers: [MinistriesController],
  providers: [MinistriesService],
  exports: [MinistriesService],
})
export class MinistriesModule {}
