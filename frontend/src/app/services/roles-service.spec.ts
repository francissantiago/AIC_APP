import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { environment } from 'environments/environment.development';
import { of } from 'rxjs';
import { RolesService } from './roles-service';

describe('RolesService', () => {
  const baseUrl = `${environment.apiUrl}/roles`;
  let http: { get: ReturnType<typeof vi.fn> };
  let service: RolesService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    http = { get: vi.fn() };

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
      { id: 1, code: 'ADMIN', name: 'Administrador', description: null },
      { id: 2, code: 'MEMBER', name: 'Membro', description: null },
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
});
