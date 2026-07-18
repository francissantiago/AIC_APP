import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsModule } from './infra/events/events.module';
import { HealthModule } from './infra/health/health.module';
import { TasksModule } from './infra/tasks/tasks.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { AssetsModule } from './modules/assets/assets.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClassesModule } from './modules/classes/classes.module';
import { CongregationsModule } from './modules/congregations/congregations.module';
import { FamiliesModule } from './modules/families/families.module';
import { FinanceModule } from './modules/finance/finance.module';
import { MemberTransfersModule } from './modules/member-transfers/member-transfers.module';
import { MembersModule } from './modules/members/members.module';
import { MinistriesModule } from './modules/ministries/ministries.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { RolesModule } from './modules/roles/roles.module';
import { SecretariatModule } from './modules/secretariat/secretariat.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { SmallGroupsModule } from './modules/small-groups/small-groups.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql' as const,
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get<string>('DB_USER', 'root'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.get<string>('DB_NAME', 'db_aic'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    ScheduleModule.forRoot(),
    HealthModule,
    TasksModule,
    EventsModule,
    AuthModule,
    PermissionsModule,
    RolesModule,
    UsersModule,
    MembersModule,
    MemberTransfersModule,
    FamiliesModule,
    AnnouncementsModule,
    NotificationsModule,
    MinistriesModule,
    ClassesModule,
    SmallGroupsModule,
    SchedulesModule,
    CongregationsModule,
    FinanceModule,
    AssetsModule,
    SecretariatModule,
  ],
})
export class AppModule {}
