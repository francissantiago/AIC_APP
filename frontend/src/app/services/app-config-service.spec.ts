import { TestBed } from '@angular/core/testing';
import { environment } from 'environments/environment';
import { AppConfigService } from './app-config-service';

describe('AppConfigService', () => {
  let service: AppConfigService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  const originalConfig = {
    apiUrl: environment.apiUrl,
    wsUrl: environment.wsUrl,
    versionCheckIntervalMs: environment.versionCheckIntervalMs,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AppConfigService);
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    environment.apiUrl = originalConfig.apiUrl;
    environment.wsUrl = originalConfig.wsUrl;
    environment.versionCheckIntervalMs = originalConfig.versionCheckIntervalMs;
  });

  it('aplica apiUrl e wsUrl do app-config.json', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          apiUrl: 'https://api.example.org/api',
          wsUrl: 'https://api.example.org',
          versionCheckIntervalMs: 60000,
        }),
        { status: 200 },
      ),
    );

    await service.load();

    expect(environment.apiUrl).toBe('https://api.example.org/api');
    expect(environment.wsUrl).toBe('https://api.example.org');
    expect(environment.versionCheckIntervalMs).toBe(60000);
  });

  it('mantém defaults quando o fetch falha', async () => {
    const previousApiUrl = environment.apiUrl;
    fetchSpy.mockRejectedValue(new Error('network'));

    await service.load();

    expect(environment.apiUrl).toBe(previousApiUrl);
  });
});
