import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthService],
    }).compile();

    service = module.get(HealthService);
  });

  it('retorna status ok com timestamp ISO e versão fora de produção', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      const result = service.getStatus();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.version).toBeTruthy();
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it('usa a versão definida em backend/package.json fora de produção', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
      expect(service.getStatus().version).toBe('1.0.1');
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it('em produção retorna apenas status (AIC-SEC-022)', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(service.getStatus()).toEqual({ status: 'ok' });
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});
