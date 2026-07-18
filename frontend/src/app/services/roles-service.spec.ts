import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { environment } from 'environments/environment';
import { of } from 'rxjs';
import { RolesService } from './roles-service';

describe('RolesService', () => {
  const baseUrl = `${environment.apiUrl}/roles`;
  let http: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let service: RolesService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    http = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [RolesService, { provide: HttpClient, useValue: http }],
    });
    service = TestBed.inject(RolesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('list should GET roles catalog', () => {
    const roles = [
      { id: 1, code: 'ADMIN', name: 'Administrador', description: null, isSystem: true },
      { id: 2, code: 'MEMBER', name: 'Membro', description: null, isSystem: true },
    ];
    http.get.mockReturnValue(of(roles));

    service.list().subscribe((result) => {
      expect(result).toEqual(roles);
    });

    expect(http.get).toHaveBeenCalledWith(
      baseUrl,
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it('getById should GET role by id', () => {
    const role = {
      id: 10,
      code: 'VOLUNTEER',
      name: 'Voluntário',
      description: null,
      isSystem: false,
    };
    http.get.mockReturnValue(of(role));

    service.getById(10).subscribe((result) => {
      expect(result).toEqual(role);
    });

    expect(http.get).toHaveBeenCalledWith(
      `${baseUrl}/10`,
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it('create should POST role payload', () => {
    const payload = { code: 'VOLUNTEER', name: 'Voluntário', description: null };
    const created = { id: 10, ...payload, isSystem: false };
    http.post.mockReturnValue(of(created));

    service.create(payload).subscribe((result) => {
      expect(result).toEqual(created);
    });

    expect(http.post).toHaveBeenCalledWith(
      baseUrl,
      payload,
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it('update should PATCH role payload', () => {
    const payload = { name: 'Voluntário Senior', description: null };
    const updated = {
      id: 10,
      code: 'VOLUNTEER',
      name: 'Voluntário Senior',
      description: null,
      isSystem: false,
    };
    http.patch.mockReturnValue(of(updated));

    service.update(10, payload).subscribe((result) => {
      expect(result).toEqual(updated);
    });

    expect(http.patch).toHaveBeenCalledWith(
      `${baseUrl}/10`,
      payload,
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it('delete should DELETE role by id', () => {
    http.delete.mockReturnValue(of(undefined));

    service.delete(10).subscribe();

    expect(http.delete).toHaveBeenCalledWith(
      `${baseUrl}/10`,
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });
});
