import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp } from './create-e2e-app';

const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@admin.com';
const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';
const describeIntegration = E2E_ADMIN_PASSWORD ? describe : describe.skip;

interface AuthResponseBody {
  accessToken: string;
  user: { id: string; email: string };
}

interface UserCongregationBody {
  congregationId: string;
  congregationName: string;
  congregationType: string;
  isDefault: boolean;
}

interface ApiErrorBody {
  code: string;
}

describeIntegration('Congregation context (e2e)', () => {
  let app: INestApplication<App>;
  let accessToken = '';
  let defaultCongregationId = '';
  let createdBranchId = '';

  beforeAll(async () => {
    app = await createE2eApp();

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: E2E_ADMIN_EMAIL, password: E2E_ADMIN_PASSWORD });

    if (loginResponse.status !== 200) {
      throw new Error(
        `Login E2E falhou (${loginResponse.status}). Verifique DB dev, seed admin e E2E_ADMIN_* no .env.`,
      );
    }

    const body = loginResponse.body as AuthResponseBody;
    accessToken = body.accessToken;
  });

  afterAll(async () => {
    if (createdBranchId && accessToken) {
      await request(app.getHttpServer())
        .delete(`/api/congregations/${createdBranchId}`)
        .set('Authorization', `Bearer ${accessToken}`);
    }
    await app.close();
  });

  it('GET /api/me/congregations retorna membership com default', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/me/congregations')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const memberships = response.body as UserCongregationBody[];
    expect(Array.isArray(memberships)).toBe(true);
    expect(memberships.length).toBeGreaterThan(0);

    const defaultMembership = memberships.find((item) => item.isDefault);
    expect(defaultMembership).toBeDefined();
    defaultCongregationId = defaultMembership!.congregationId;
  });

  it('GET /api/members usa congregação default quando header ausente', async () => {
    await request(app.getHttpServer())
      .get('/api/members')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('GET /api/members rejeita X-Congregation-Id sem membership', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/members')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Congregation-Id', '00000000-0000-4000-8000-000000000001')
      .expect(403);

    const body = response.body as ApiErrorBody;
    expect(body.code).toBe('CONGREGATIONS.CONTEXT_DENIED');
  });

  it('GET /api/members aceita X-Congregation-Id válido', async () => {
    await request(app.getHttpServer())
      .get('/api/members')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Congregation-Id', defaultCongregationId)
      .expect(200);
  });

  it('POST /api/congregations cria filial e GET lista inclui', async () => {
    const suffix = Date.now();
    const createResponse = await request(app.getHttpServer())
      .post('/api/congregations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Filial E2E ${suffix}`,
        email: `e2e-branch-${suffix}@example.test`,
        document: `${String(suffix).slice(-11).padStart(11, '0')}`,
      })
      .expect(201);

    const branch = createResponse.body as { id: string; type: string };
    expect(branch.type).toBe('branch');
    createdBranchId = branch.id;

    const listResponse = await request(app.getHttpServer())
      .get('/api/congregations')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const listBody = listResponse.body as {
      data: Array<{ id: string }>;
    };
    expect(listBody.data.some((item) => item.id === createdBranchId)).toBe(
      true,
    );
  });
});
