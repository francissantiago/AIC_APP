import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ExampleService } from './example-service';

describe('ExampleService', () => {
  let service: ExampleService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ExampleService,
        {
          provide: HttpClient,
          useValue: {
            get: () => of({}),
            post: () => of({}),
            put: () => of({}),
            patch: () => of({}),
            delete: () => of({}),
          },
        },
      ],
    });
    service = TestBed.inject(ExampleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
