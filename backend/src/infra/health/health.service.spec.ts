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

  it('retorna status ok com timestamp ISO e versão', () => {
    const result = service.getStatus();

    expect(result.status).toBe('ok');
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.version).toBeTruthy();
  });

  it('usa a versão definida em backend/package.json', () => {
    expect(service.getStatus().version).toBe('1.0.1');
  });
});
