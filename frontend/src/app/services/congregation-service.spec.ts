import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { CongregationStatus } from '@enums/congregation-status';
import { CongregationType } from '@enums/congregation-type';
import { environment } from 'environments/environment';
import { of } from 'rxjs';
import { CongregationService } from './congregation-service';

describe('CongregationService', () => {
  const baseUrl = `${environment.apiUrl}/congregation`;
  let http: {
    get: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
  };
  let service: CongregationService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    http = {
      get: vi.fn(),
      patch: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [CongregationService, { provide: HttpClient, useValue: http }],
    });
    service = TestBed.inject(CongregationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('get should GET the singleton congregation', () => {
    http.get.mockReturnValue(
      of({
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        name: 'Congregação',
        tradeName: null,
        type: CongregationType.HEADQUARTERS,
        document: null,
        email: null,
        phone: null,
        address: null,
        city: null,
        state: null,
        zipCode: null,
        foundationDate: null,
        website: null,
        status: CongregationStatus.ACTIVE,
        notes: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    );

    service.get().subscribe();

    expect(http.get).toHaveBeenCalledWith(
      baseUrl,
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it('update should PATCH the singleton congregation', () => {
    http.patch.mockReturnValue(
      of({
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        name: 'Congregação Central',
        email: 'contato@aic.org',
      }),
    );

    service.update({ name: 'Congregação Central', email: 'contato@aic.org' }).subscribe();

    expect(http.patch).toHaveBeenCalledWith(
      baseUrl,
      { name: 'Congregação Central', email: 'contato@aic.org' },
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });
});
