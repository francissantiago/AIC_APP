import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { CongregationStatus } from '@enums/congregation-status';
import { CongregationType } from '@enums/congregation-type';
import { environment } from 'environments/environment';
import { of } from 'rxjs';
import { CongregationsService } from './congregations-service';

describe('CongregationsService', () => {
  const baseUrl = `${environment.apiUrl}/congregations`;
  let http: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let service: CongregationsService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    http = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [CongregationsService, { provide: HttpClient, useValue: http }],
    });
    service = TestBed.inject(CongregationsService);
  });

  it('findAll should pass query params', () => {
    http.get.mockReturnValue(of({ data: [], total: 0, page: 1, limit: 20 }));

    service.findAll({ page: 2, limit: 10, q: 'norte', type: CongregationType.BRANCH }).subscribe();

    expect(http.get).toHaveBeenCalledWith(
      baseUrl,
      expect.objectContaining({
        params: expect.objectContaining({
          get: expect.any(Function),
        }),
      }),
    );
  });

  it('createBranch should POST body', () => {
    http.post.mockReturnValue(of({ id: '1', name: 'Filial' }));

    service.createBranch({ name: 'Filial', status: CongregationStatus.ACTIVE }).subscribe();

    expect(http.post).toHaveBeenCalledWith(
      baseUrl,
      { name: 'Filial', status: CongregationStatus.ACTIVE },
      expect.any(Object),
    );
  });

  it('update should PATCH by id', () => {
    http.patch.mockReturnValue(of({ id: '1' }));

    service.update('1', { name: 'Atualizada' }).subscribe();

    expect(http.patch).toHaveBeenCalledWith(
      `${baseUrl}/1`,
      { name: 'Atualizada' },
      expect.any(Object),
    );
  });

  it('remove should DELETE by id', () => {
    http.delete.mockReturnValue(of(undefined));

    service.remove('1').subscribe();

    expect(http.delete).toHaveBeenCalledWith(`${baseUrl}/1`, expect.any(Object));
  });
});
