import { Pipe, PipeTransform, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { IGoogleCalendarConnectionStatus } from '@interfaces/IGoogleCalendar';
import { AuthService } from '@services/auth-service';
import { GoogleCalendarService } from '@services/google-calendar-service';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { translateServiceStub } from '../../../testing/translate-testing';
import { GoogleCalendarPanel } from './google-calendar-panel';

@Pipe({ name: 'translate' })
class TranslatePipeStub implements PipeTransform {
  transform(key: string): string {
    return key;
  }
}

describe('GoogleCalendarPanel', () => {
  let fixture: ComponentFixture<GoogleCalendarPanel>;
  let component: GoogleCalendarPanel;
  let statusResponse: IGoogleCalendarConnectionStatus;

  const gcalMock = {
    getStatus: vi.fn(),
    getOAuthUrl: vi.fn(),
    syncNow: vi.fn(),
    disconnect: vi.fn(),
    listCalendars: vi.fn(),
    updateSettings: vi.fn(),
  };

  const routeStub = {
    snapshot: {
      queryParamMap: {
        get: () => null,
      },
    },
  };

  const routerStub = {
    navigate: vi.fn().mockResolvedValue(true),
  };

  async function setup(canWrite = true): Promise<void> {
    TestBed.resetTestingModule();
    statusResponse = {
      configured: true,
      connected: false,
      status: null,
      email: null,
      googleCalendarId: null,
      syncDirection: null,
      conflictPolicy: null,
      lastSyncAt: null,
      lastSyncError: null,
    };
    gcalMock.getStatus.mockReset();
    gcalMock.getStatus.mockImplementation(() => of(statusResponse));
    gcalMock.listCalendars.mockReturnValue(of({ items: [] }));

    await TestBed.configureTestingModule({
      imports: [GoogleCalendarPanel],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        { provide: GoogleCalendarService, useValue: gcalMock },
        { provide: ActivatedRoute, useValue: routeStub },
        { provide: Router, useValue: routerStub },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({ permissions: [] }),
            hasPermission: (code: string) =>
              canWrite ? code === 'secretariat:write' || code === 'secretariat:read' : false,
          },
        },
      ],
    })
      .overrideComponent(GoogleCalendarPanel, {
        set: { imports: [ReactiveFormsModule, TranslatePipeStub] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(GoogleCalendarPanel);
    component = fixture.componentInstance;
  }

  it('mostra estado desconectado e botão conectar', async () => {
    await setup(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.connected()).toBe(false);
    expect(component.integrationAvailable()).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-testid="gcal-connect"]')).toBeTruthy();
  });

  it('oculta a integração quando OAuth não está configurado no backend', async () => {
    await setup(true);
    statusResponse = {
      configured: false,
      connected: false,
      status: null,
      email: null,
      googleCalendarId: null,
      syncDirection: null,
      conflictPolicy: null,
      lastSyncAt: null,
      lastSyncError: null,
    };
    gcalMock.getStatus.mockReturnValue(of(statusResponse));

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.integrationAvailable()).toBe(false);
    expect(fixture.nativeElement.querySelector('[data-testid="gcal-connect"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="gcal-oauth-disclosure"]')).toBeNull();
  });

  it('mostra estado conectado e ações de sync', async () => {
    await setup(true);
    statusResponse = {
      configured: true,
      connected: true,
      status: 'active',
      email: 'ab***@gmail.com',
      googleCalendarId: 'primary',
      syncDirection: 'bidirectional',
      conflictPolicy: 'latest_wins',
      lastSyncAt: '2026-07-20T10:00:00.000Z',
      lastSyncError: null,
    };
    gcalMock.getStatus.mockReturnValue(of(statusResponse));

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.connected()).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-testid="gcal-sync-now"]')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="gcal-status-connected"]'),
    ).toBeTruthy();
  });

  it('desabilita botões quando gcalBusy', async () => {
    await setup(true);
    statusResponse = {
      configured: true,
      connected: true,
      status: 'active',
      email: 'ab***@gmail.com',
      googleCalendarId: 'primary',
      syncDirection: 'bidirectional',
      conflictPolicy: 'latest_wins',
      lastSyncAt: null,
      lastSyncError: null,
    };
    gcalMock.getStatus.mockReturnValue(of(statusResponse));

    fixture.detectChanges();
    await fixture.whenStable();
    component.gcalBusy.set(true);
    fixture.detectChanges();

    const syncBtn = fixture.nativeElement.querySelector(
      '[data-testid="gcal-sync-now"]',
    ) as HTMLButtonElement;
    expect(syncBtn.disabled).toBe(true);
  });

  it('não mostra ações write sem permissão', async () => {
    await setup(false);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="gcal-connect"]')).toBeNull();
  });

  it('expõe signals de feedback', async () => {
    await setup(true);
    component.gcalFeedback.set({ message: 'ok', tone: 'success' });
    expect(component.gcalFeedback()?.tone).toBe('success');
  });
});
