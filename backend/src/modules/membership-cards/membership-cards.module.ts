import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CongregationsModule } from '../congregations/congregations.module';
import { FamilyMember } from '../families/entities/family-member.entity';
import { Member } from '../members/entities/member.entity';
import { MinistryMember } from '../ministries/entities/ministry-member.entity';
import { StorageModule } from '../secretariat/storage/storage.module';
import { MembershipCardSettings } from './entities/membership-card-settings.entity';
import { MembershipCardsController } from './membership-cards.controller';
import { MembershipCardsPublicController } from './membership-cards-public.controller';
import { MembershipCardsService } from './membership-cards.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MembershipCardSettings,
      Member,
      FamilyMember,
      MinistryMember,
    ]),
    CongregationsModule,
    StorageModule,
  ],
  controllers: [MembershipCardsController, MembershipCardsPublicController],
  providers: [MembershipCardsService],
  exports: [MembershipCardsService],
})
export class MembershipCardsModule {}
