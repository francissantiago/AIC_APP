import { TestBed } from '@angular/core/testing';
import { environment } from 'environments/environment';
import { of, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { MeCongregationsService } from './me-congregations-service';

describe('MeCongregationsService', () => {
  const baseUrl = `${environment.apiUrl}/me/congregations`;
  let http: { get: ReturnType<typeof vi.fn> };
  let service: MeCongregationsService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    http = { get: vi.fn() };

    TestBed.configureTestingModule({
      providers: [MeCongregationsService, { provide: HttpClient, useValue: http }],
    });
    service = TestBed.inject(MeCongregationsService);
  });

  it('listMine should GET memberships', () => {
    http.get.mockReturnValue(of([]));

    service.listMine().subscribe();

    expect(http.get).toHaveBeenCalledWith(
      baseUrl,
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it('listMine should not retry on 4xx', () => {
    http.get.mockReturnValue(throwError(() => ({ status: 404 })));

    service.listMine().subscribe({ error: () => undefined });

    expect(http.get).toHaveBeenCalledTimes(1);
  });
});
