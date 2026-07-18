import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { environment } from 'environments/environment';
import { of } from 'rxjs';
import { PermissionsService } from './permissions-service';

describe('PermissionsService', () => {
  const baseUrl = `${environment.apiUrl}/permissions`;
  let http: {
    get: ReturnType<typeof vi.fn>;
  };
  let service: PermissionsService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    http = {
      get: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [PermissionsService, { provide: HttpClient, useValue: http }],
    });
    service = TestBed.inject(PermissionsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('list should GET permissions catalog', () => {
    const permissions = [
      { id: 1, code: 'finance:read', resource: 'finance', action: 'read', description: null },
      { id: 2, code: 'finance:write', resource: 'finance', action: 'write', description: null },
    ];
    http.get.mockReturnValue(of(permissions));

    service.list().subscribe((result) => {
      expect(result).toEqual(permissions);
    });

    expect(http.get).toHaveBeenCalledWith(
      baseUrl,
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });
});
