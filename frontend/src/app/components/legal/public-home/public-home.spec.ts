import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { translateServiceStub } from '../../../testing/translate-testing';
import { PublicHome } from './public-home';

describe('PublicHome', () => {
  let fixture: ComponentFixture<PublicHome>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [PublicHome],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        { provide: TranslatePipe, useValue: { transform: (key: string) => key } },
        { provide: Title, useValue: { setTitle: () => undefined } },
      ],
    })
      .overrideComponent(PublicHome, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(PublicHome);
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
