import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  ChartData,
  ChartOptions,
  DoughnutController,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';

Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Legend,
  LinearScale,
  Tooltip,
);

@Component({
  selector: 'app-chart-canvas',
  imports: [TranslatePipe],
  template: `
    <section
      class="rounded-md border border-slate-200 p-4"
      [attr.aria-labelledby]="titleId()"
      [attr.data-testid]="testId() ?? null"
    >
      <h2 [id]="titleId()" class="mb-3 font-semibold text-slate-900">
        {{ titleKey() | translate }}
      </h2>
      @if (empty()) {
        <p class="text-sm text-slate-600">{{ 'FINANCE.NO_CHART_DATA' | translate }}</p>
      } @else {
        <div class="relative h-72">
          <canvas
            #canvas
            role="img"
            [attr.aria-label]="titleKey() | translate"
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartCanvas {
  readonly type = input.required<'bar' | 'doughnut'>();
  readonly data = input.required<ChartData<'bar' | 'doughnut'>>();
  readonly options = input<ChartOptions<'bar' | 'doughnut'>>({});
  readonly titleKey = input.required<string>();
  readonly summary = input<readonly string[]>([]);
  readonly empty = input(false);
  readonly titleId = input('finance-chart-title');
  readonly summaryId = input('finance-chart-summary');
  readonly testId = input<string | undefined>(undefined);

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  #chart: Chart<'bar' | 'doughnut'> | null = null;

  constructor() {
    effect((onCleanup) => {
      const canvas = this.canvas()?.nativeElement;
      const type = this.type();
      const data = this.data();
      const options = this.options();
      const empty = this.empty();

      this.#destroyChart();
      if (!canvas || empty) {
        return;
      }

      const reducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const configuration = {
        type,
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          ...options,
          animation: reducedMotion ? false : options.animation,
        },
      } as ChartConfiguration<'bar' | 'doughnut'>;
      this.#chart = new Chart(canvas, configuration);
      onCleanup(() => this.#destroyChart());
    });
  }

  #destroyChart(): void {
    this.#chart?.destroy();
    this.#chart = null;
  }
}
