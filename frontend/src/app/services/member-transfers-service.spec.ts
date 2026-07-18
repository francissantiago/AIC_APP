import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { environment } from 'environments/environment';
import { of } from 'rxjs';
import { MemberTransferStatus } from '@enums/member-transfer-status';
import { MemberTransfersService } from './member-transfers-service';

describe('MemberTransfersService', () => {
  const baseUrl = `${environment.apiUrl}/members`;
  let http: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
  };
  let service: MemberTransfersService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    http = {
      get: vi.fn(),
      post: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [MemberTransfersService, { provide: HttpClient, useValue: http }],
    });
    service = TestBed.inject(MemberTransfersService);
  });

  it('lists transfers for a member', () => {
    http.get.mockReturnValue(
      of([
        {
          id: 't1',
          status: MemberTransferStatus.PENDING,
        },
      ]),
    );

    service.list('mem-1').subscribe((items) => {
      expect(items.length).toBe(1);
      expect(items[0].status).toBe(MemberTransferStatus.PENDING);
    });

    expect(http.get).toHaveBeenCalledWith(
      `${baseUrl}/mem-1/transfers`,
      expect.objectContaining({ headers: expect.anything() }),
    );
  });

  it('creates transfer with completeNow', () => {
    http.post.mockReturnValue(
      of({
        id: 't1',
        status: MemberTransferStatus.COMPLETED,
      }),
    );

    service
      .create('mem-1', {
        destinationChurchName: 'Igreja Destino',
        destinationCity: 'Campinas',
        completeNow: true,
      })
      .subscribe((item) => {
        expect(item.status).toBe(MemberTransferStatus.COMPLETED);
      });

    expect(http.post).toHaveBeenCalledWith(
      `${baseUrl}/mem-1/transfers`,
      expect.objectContaining({ completeNow: true }),
      expect.objectContaining({ headers: expect.anything() }),
    );
  });
});
