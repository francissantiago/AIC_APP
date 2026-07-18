import { HttpClient, HttpParams } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { UserStatus } from '@enums/user-status';
import { environment } from 'environments/environment';
import { of } from 'rxjs';
import { UsersService } from './users-service';

describe('UsersService', () => {
  const baseUrl = `${environment.apiUrl}/users`;
  let http: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let service: UsersService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    http = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [UsersService, { provide: HttpClient, useValue: http }],
    });
    service = TestBed.inject(UsersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('list should GET users with query params', () => {
    http.get.mockReturnValue(of({ data: [], total: 0, page: 2, limit: 10 }));

    service.list({ page: 2, limit: 10, status: UserStatus.ACTIVE, q: 'ana' }).subscribe();

    expect(http.get).toHaveBeenCalledTimes(1);
    const [url, options] = http.get.mock.calls[0] as [string, { params: HttpParams }];
    expect(url).toBe(baseUrl);
    expect(options.params.get('page')).toBe('2');
    expect(options.params.get('limit')).toBe('10');
    expect(options.params.get('status')).toBe('active');
    expect(options.params.get('q')).toBe('ana');
  });

  it('create should POST user', () => {
    const body = {
      username: 'ana.silva',
      email: 'ana@igreja.org',
      fullName: 'Ana Silva',
      password: 'SenhaForte1',
      roleIds: [1],
    };
    http.post.mockReturnValue(
      of({
        id: '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f',
        ...body,
        status: UserStatus.PENDING,
        twoFactorEnabled: false,
        lastLoginAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        roles: [],
      }),
    );

    service.create(body).subscribe();

    expect(http.post).toHaveBeenCalledWith(
      baseUrl,
      body,
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it('update should PATCH user', () => {
    const id = '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f';
    http.patch.mockReturnValue(of({ id, email: 'nova@igreja.org' }));

    service.update(id, { email: 'nova@igreja.org' }).subscribe();

    expect(http.patch).toHaveBeenCalledWith(
      `${baseUrl}/${id}`,
      { email: 'nova@igreja.org' },
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it('setRoles should PUT roles', () => {
    const id = '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f';
    http.put.mockReturnValue(of({ id, roles: [] }));

    service.setRoles(id, { roleIds: [1, 2] }).subscribe();

    expect(http.put).toHaveBeenCalledWith(
      `${baseUrl}/${id}/roles`,
      { roleIds: [1, 2] },
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it('remove should DELETE user', () => {
    const id = '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f';
    http.delete.mockReturnValue(of(undefined));

    service.remove(id).subscribe();

    expect(http.delete).toHaveBeenCalledWith(
      `${baseUrl}/${id}`,
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });
});
