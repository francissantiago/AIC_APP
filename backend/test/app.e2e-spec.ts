import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp } from './create-e2e-app';

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await createE2eApp();
  });

  it('/api/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        const body = res.body as { status: string; timestamp: string };
        expect(body.status).toBe('ok');
        expect(body.timestamp).toBeDefined();
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
