import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CongregationsModule } from '../congregations/congregations.module';
import { Member } from '../members/entities/member.entity';
import { MembersModule } from '../members/members.module';
import { SecretariatModule } from '../secretariat/secretariat.module';
import { MemberTransfer } from './entities/member-transfer.entity';
import { MemberTransfersController } from './member-transfers.controller';
import { MemberTransfersService } from './member-transfers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MemberTransfer, Member]),
    MembersModule,
    SecretariatModule,
    CongregationsModule,
  ],
  controllers: [MemberTransfersController],
  providers: [MemberTransfersService],
  exports: [MemberTransfersService],
})
export class MemberTransfersModule {}
