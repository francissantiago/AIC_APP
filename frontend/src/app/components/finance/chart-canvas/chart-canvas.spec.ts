import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';
import { translateServiceStub } from '../../../testing/translate-testing';
import { ChartCanvas } from './chart-canvas';

const chartSpies = vi.hoisted(() => ({
  create: vi.fn(),
  destroy: vi.fn(),
}));

vi.mock('chart.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('chart.js')>();
  class ChartMock {
    static register(): void {}

    constructor() {
      chartSpies.create();
    }

    destroy(): void {
      chartSpies.destroy();
    }
  }

  return { ...actual, Chart: ChartMock };
});

describe('ChartCanvas', () => {
  beforeEach(() => {
    chartSpies.create.mockClear();
    chartSpies.destroy.mockClear();
  });

  it('renders an accessible textual fallback without an empty canvas', async () => {
    await TestBed.configureTestingModule({
      imports: [ChartCanvas],
      providers: [{ provide: TranslateService, useValue: translateServiceStub() }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ChartCanvas);
    fixture.componentRef.setInput('type', 'bar');
    fixture.componentRef.setInput('data', { labels: [], datasets: [] });
    fixture.componentRef.setInput('titleKey', 'FINANCE.MONTHLY_CHART');
    fixture.componentRef.setInput('empty', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('canvas')).toBeNull();
    expect(fixture.nativeElement.querySelector('section').getAttribute('aria-labelledby')).toBe(
      'finance-chart-title',
    );
  });

  it('renders the chart summary as visible equivalent content', async () => {
    await TestBed.configureTestingModule({
      imports: [ChartCanvas],
      providers: [{ provide: TranslateService, useValue: translateServiceStub() }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ChartCanvas);
    fixture.componentRef.setInput('type', 'bar');
    fixture.componentRef.setInput('data', { labels: ['2026-07'], datasets: [] });
    fixture.componentRef.setInput('titleKey', 'FINANCE.MONTHLY_CHART');
    fixture.componentRef.setInput('summary', ['2026-07: Income R$ 100.00']);
    fixture.componentRef.setInput('empty', true);
    fixture.detectChanges();

    const summary = fixture.nativeElement.querySelector('#finance-chart-summary');
    expect(summary).not.toBeNull();
    expect(summary.classList.contains('sr-only')).toBe(false);
    expect(summary.textContent).toContain('2026-07');
  });

  it('creates and destroys the Chart.js instance with the component lifecycle', async () => {
    await TestBed.configureTestingModule({
      imports: [ChartCanvas],
      providers: [{ provide: TranslateService, useValue: translateServiceStub() }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ChartCanvas);
    fixture.componentRef.setInput('type', 'bar');
    fixture.componentRef.setInput('data', { labels: ['2026-07'], datasets: [] });
    fixture.componentRef.setInput('titleKey', 'FINANCE.MONTHLY_CHART');
    fixture.detectChanges();

    expect(chartSpies.create).toHaveBeenCalledOnce();
    fixture.destroy();
    expect(chartSpies.destroy).toHaveBeenCalledOnce();
  });
});
