import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
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
  beforeEach(async () => {
    chartSpies.create.mockClear();
    chartSpies.destroy.mockClear();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ChartCanvas],
    })
      .overrideComponent(ChartCanvas, {
        set: {
          imports: [],
          template: `
            <section class="rounded-md border border-slate-200 p-4" [attr.aria-labelledby]="titleId()">
              <h2 [id]="titleId()" class="mb-3 font-semibold text-slate-900">{{ titleKey() }}</h2>
              @if (empty()) {
                <p class="text-sm text-slate-600">FINANCE.NO_CHART_DATA</p>
              } @else {
                <div class="relative h-72">
                  <canvas
                    #canvas
                    role="img"
                    [attr.aria-label]="titleKey()"
                    [attr.aria-describedby]="summaryId()"
                  ></canvas>
                </div>
              }
              @if (summary().length > 0) {
                <ul [id]="summaryId()" class="mt-3 space-y-1 text-sm text-slate-600">
                  @for (item of summary(); track item) {
                    <li>{{ item }}</li>
                  }
                </ul>
              }
            </section>
          `,
        },
      })
      .compileComponents();
  });

  it('renders an accessible textual fallback without an empty canvas', () => {
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

  it('renders the chart summary as visible equivalent content', () => {
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

  it('creates and destroys the Chart.js instance with the component lifecycle', () => {
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
