import { HttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Example } from './example';

describe('Example', () => {
  let component: Example;
  let fixture: ComponentFixture<Example>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [Example],
      providers: [
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
    })
      .overrideComponent(Example, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(Example);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
