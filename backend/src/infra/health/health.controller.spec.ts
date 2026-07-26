import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;

  const healthServiceMock = {
    getStatus: jest.fn(() => ({
      status: 'ok',
      timestamp: '2026-07-26T18:00:00.000Z',
      version: '1.0.1',
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: healthServiceMock }],
    }).compile();

    controller = module.get(HealthController);
  });

  it('delega ao HealthService e retorna versão', () => {
    const result = controller.getHealth();

    expect(healthServiceMock.getStatus).toHaveBeenCalled();
    expect(result).toEqual({
      status: 'ok',
      timestamp: '2026-07-26T18:00:00.000Z',
      version: '1.0.1',
    });
  });
});
