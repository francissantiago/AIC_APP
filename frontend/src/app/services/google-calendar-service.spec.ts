import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { environment } from 'environments/environment';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { GoogleCalendarService } from './google-calendar-service';

describe('GoogleCalendarService', () => {
  const base = `${environment.apiUrl}/secretariat/google-calendar`;
  let http: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
  };
  let service: GoogleCalendarService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    http = {
      get: vi.fn().mockReturnValue(of({})),
      post: vi.fn().mockReturnValue(of({})),
      patch: vi.fn().mockReturnValue(of({})),
    };
    TestBed.configureTestingModule({
      providers: [GoogleCalendarService, { provide: HttpClient, useValue: http }],
    });
    service = TestBed.inject(GoogleCalendarService);
  });

  it('GET status no path correto', () => {
    service.getStatus().subscribe();
    expect(http.get).toHaveBeenCalledWith(
      `${base}/status`,
      expect.objectContaining({ headers: expect.anything() }),
    );
  });

  it('GET oauth/url no path correto', () => {
    service.getOAuthUrl().subscribe();
    expect(http.get).toHaveBeenCalledWith(
      `${base}/oauth/url`,
      expect.objectContaining({ headers: expect.anything() }),
    );
  });

  it('POST sync no path correto', () => {
    service.syncNow().subscribe();
    expect(http.post).toHaveBeenCalledWith(
      `${base}/sync`,
      {},
      expect.objectContaining({ headers: expect.anything() }),
    );
  });

  it('POST disconnect no path correto', () => {
    service.disconnect().subscribe();
    expect(http.post).toHaveBeenCalledWith(
      `${base}/disconnect`,
      {},
      expect.objectContaining({ headers: expect.anything() }),
    );
  });

  it('PATCH settings no path correto', () => {
    service.updateSettings({ syncDirection: 'bidirectional' }).subscribe();
    expect(http.patch).toHaveBeenCalledWith(
      `${base}/settings`,
      { syncDirection: 'bidirectional' },
      expect.objectContaining({ headers: expect.anything() }),
    );
  });
});
