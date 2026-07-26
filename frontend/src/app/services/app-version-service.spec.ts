import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppVersionService } from './app-version-service';

describe('AppVersionService', () => {
  let service: AppVersionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AppVersionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('currentVersion reflete environment.version', () => {
    expect(service.currentVersion()).toBeTruthy();
  });

  it('checkForUpdate não marca updateAvailable quando versões coincidem', () => {
    service.checkForUpdate().subscribe();

    const request = httpMock.expectOne((req) => req.url.startsWith('/version.json'));
    request.flush({
      version: service.currentVersion(),
      builtAt: service.currentBuiltAt(),
    });

    expect(service.updateAvailable()).toBe(false);
  });

  it('checkForUpdate marca updateAvailable quando versão remota difere', () => {
    service.checkForUpdate().subscribe();

    const request = httpMock.expectOne((req) => req.url.startsWith('/version.json'));
    request.flush({
      version: '9.9.9',
      builtAt: '2026-07-26T19:00:00.000Z',
    });

    expect(service.updateAvailable()).toBe(true);
    expect(service.remoteVersion()).toBe('9.9.9');
  });

  it('checkForUpdate falha silenciosamente em erro HTTP', () => {
    service.checkForUpdate().subscribe();

    const request = httpMock.expectOne((req) => req.url.startsWith('/version.json'));
    request.flush('Not found', { status: 404, statusText: 'Not Found' });

    expect(service.remoteVersion()).toBeNull();
    expect(service.updateAvailable()).toBe(false);
  });
});
