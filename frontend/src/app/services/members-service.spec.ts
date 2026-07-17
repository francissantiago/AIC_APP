import { HttpClient, HttpParams } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MemberStatus } from '@enums/member-status';
import { environment } from 'environments/environment.development';
import { of } from 'rxjs';
import { MembersService } from './members-service';

describe('MembersService', () => {
  const baseUrl = `${environment.apiUrl}/members`;
  let http: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let service: MembersService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    http = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [MembersService, { provide: HttpClient, useValue: http }],
    });
    service = TestBed.inject(MembersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('list should GET members with query params', () => {
    http.get.mockReturnValue(of({ data: [], total: 0, page: 2, limit: 10 }));

    service.list({ page: 2, limit: 10, status: MemberStatus.ACTIVE, q: 'maria' }).subscribe();

    expect(http.get).toHaveBeenCalledTimes(1);
    const [url, options] = http.get.mock.calls[0] as [string, { params: HttpParams }];
    expect(url).toBe(baseUrl);
    expect(options.params.get('page')).toBe('2');
    expect(options.params.get('limit')).toBe('10');
    expect(options.params.get('status')).toBe('active');
    expect(options.params.get('q')).toBe('maria');
  });

  it('create should POST member', () => {
    const body = {
      fullName: 'Maria da Silva',
      email: 'maria@igreja.org',
    };
    http.post.mockReturnValue(
      of({
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        ...body,
        phone: null,
        document: null,
        birthDate: null,
        gender: 'unspecified',
        maritalStatus: 'other',
        status: MemberStatus.ACTIVE,
        baptismDate: null,
        membershipDate: null,
        address: null,
        city: null,
        state: null,
        zipCode: null,
        notes: null,
        userId: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    );

    service.create(body).subscribe();

    expect(http.post).toHaveBeenCalledWith(
      baseUrl,
      body,
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it('update should PATCH member', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    http.patch.mockReturnValue(of({ id, email: 'nova@igreja.org' }));

    service.update(id, { email: 'nova@igreja.org' }).subscribe();

    expect(http.patch).toHaveBeenCalledWith(
      `${baseUrl}/${id}`,
      { email: 'nova@igreja.org' },
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it('remove should DELETE member', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    http.delete.mockReturnValue(of(undefined));

    service.remove(id).subscribe();

    expect(http.delete).toHaveBeenCalledWith(
      `${baseUrl}/${id}`,
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });
});
