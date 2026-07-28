import { Injectable } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HealthResponseDto } from './dto/health-response.dto';

@Injectable()
export class HealthService {
  getStatus(): HealthResponseDto {
    // AIC-SEC-022: em produção não expor versão/timestamp.
    if (process.env.NODE_ENV === 'production') {
      return { status: 'ok' };
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: this.#readPackageVersion(),
    };
  }

  #readPackageVersion(): string {
    const packagePath = join(__dirname, '..', '..', '..', 'package.json');
    const raw = readFileSync(packagePath, 'utf-8');
    const parsed = JSON.parse(raw) as { version?: string };

    if (!parsed.version) {
      return '0.0.0';
    }

    return parsed.version;
  }
}
