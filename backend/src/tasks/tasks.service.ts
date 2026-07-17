import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private readonly configService: ConfigService) {}

  @Cron(CronExpression.EVERY_HOUR, {
    name: 'heartbeat',
    timeZone: process.env.APP_TIMEZONE ?? 'America/Sao_Paulo',
  })
  handleHeartbeat() {
    const timezone = this.configService.get<string>(
      'APP_TIMEZONE',
      'America/Sao_Paulo',
    );
    this.logger.log(`Heartbeat OK (timezone: ${timezone})`);
  }
}
