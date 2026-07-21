import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { translateServiceStub } from '../../../testing/translate-testing';
import { TermsOfService } from './terms-of-service';

describe('TermsOfService', () => {
  let fixture: ComponentFixture<TermsOfService>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [TermsOfService],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        { provide: TranslatePipe, useValue: { transform: (key: string) => key } },
      ],
    })
      .overrideComponent(TermsOfService, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(TermsOfService);
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
