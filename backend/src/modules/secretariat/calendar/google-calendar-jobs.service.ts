import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { GoogleCalendarSyncService } from './google-calendar-sync.service';

@Injectable()
export class GoogleCalendarJobsService {
  private readonly logger = new Logger(GoogleCalendarJobsService.name);
  private running = false;

  constructor(private readonly syncService: GoogleCalendarSyncService) {}

  @Cron('*/15 * * * *', {
    name: 'google-calendar-incremental-sync',
    timeZone: process.env.APP_TIMEZONE ?? 'America/Sao_Paulo',
  })
  async handleIncrementalSync(): Promise<void> {
    if (this.running) {
      this.logger.warn(
        'Job google-calendar-incremental-sync já em execução; pulando ciclo',
      );
      return;
    }

    this.running = true;
    try {
      this.logger.log('Iniciando sync incremental Google Calendar');
      await this.syncService.syncAllActiveConnections();
    } catch (err) {
      this.logger.error(
        `Job google-calendar-incremental-sync falhou: ${
          err instanceof Error ? err.message : 'unknown'
        }`,
      );
    } finally {
      this.running = false;
    }
  }
}
