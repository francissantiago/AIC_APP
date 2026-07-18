import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ClassesService } from './classes-service';

describe('ClassesService', () => {
  let service: ClassesService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ClassesService,
        {
          provide: HttpClient,
          useValue: {
            get: () => of({ data: [], total: 0, page: 1, limit: 20 }),
            post: () => of({}),
            put: () => of({}),
            patch: () => of({}),
            delete: () => of(undefined),
          },
        },
      ],
    });
    service = TestBed.inject(ClassesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
