import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassesModule } from '../classes/classes.module';
import { CongregationsModule } from '../congregations/congregations.module';
import { MinistriesModule } from '../ministries/ministries.module';
import { User } from '../users/entities/user.entity';
import { Member } from './entities/member.entity';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Member, User]),
    CongregationsModule,
    MinistriesModule,
    ClassesModule,
  ],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
