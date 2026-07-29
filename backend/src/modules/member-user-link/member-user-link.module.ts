import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from '../members/entities/member.entity';
import { MemberUserLinkService } from './member-user-link.service';

@Module({
  imports: [TypeOrmModule.forFeature([Member])],
  providers: [MemberUserLinkService],
  exports: [MemberUserLinkService],
})
export class MemberUserLinkModule {}
