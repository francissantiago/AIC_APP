import { HttpClient, HttpParams } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { FamilyRelation } from '@enums/family-relation';
import { environment } from 'environments/environment';
import { of } from 'rxjs';
import { FamiliesService } from './families-service';

describe('FamiliesService', () => {
  const baseUrl = `${environment.apiUrl}/families`;
  let http: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let service: FamiliesService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    http = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [FamiliesService, { provide: HttpClient, useValue: http }],
    });
    service = TestBed.inject(FamiliesService);
  });

  it('lists families with search query param', () => {
    http.get.mockReturnValue(of({ data: [], total: 0, page: 1, limit: 20 }));

    service.list({ page: 1, limit: 20, search: 'Silva' }).subscribe();

    expect(http.get).toHaveBeenCalledTimes(1);
    const [url, options] = http.get.mock.calls[0] as [string, { params: HttpParams }];
    expect(url).toBe(baseUrl);
    expect(options.params.get('page')).toBe('1');
    expect(options.params.get('limit')).toBe('20');
    expect(options.params.get('search')).toBe('Silva');
  });

  it('loads birthdays with month and optional familyId', () => {
    http.get.mockReturnValue(
      of({
        data: [
          {
            memberId: 'm1',
            fullName: 'João',
            birthDate: '2010-07-12',
            familyId: 'f1',
            familyName: 'Família Silva',
            relation: FamilyRelation.CHILD,
            day: 12,
          },
        ],
      }),
    );

    service.birthdays({ month: 7, familyId: 'f1' }).subscribe((response) => {
      expect(response.data.length).toBe(1);
      expect(response.data[0]?.relation).toBe(FamilyRelation.CHILD);
    });

    const [url, options] = http.get.mock.calls[0] as [string, { params: HttpParams }];
    expect(url).toBe(`${baseUrl}/birthdays`);
    expect(options.params.get('month')).toBe('7');
    expect(options.params.get('familyId')).toBe('f1');
  });
});
