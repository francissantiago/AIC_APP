import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { translateServiceStub } from '../../../testing/translate-testing';
import { PrivacyPolicy } from './privacy-policy';

describe('PrivacyPolicy', () => {
  let fixture: ComponentFixture<PrivacyPolicy>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [PrivacyPolicy],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        { provide: TranslatePipe, useValue: { transform: (key: string) => key } },
      ],
    })
      .overrideComponent(PrivacyPolicy, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(PrivacyPolicy);
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
