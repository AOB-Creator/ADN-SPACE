import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-battery',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'battery', '[attr.data-level]': 'level()' },
  template: `
    <span class="battery__bars" aria-hidden="true">
      @for (bar of bars; track bar) {
        <i [class.on]="bar < filled()"></i>
      }
    </span>
    @if (showLabel()) {
      <span class="battery__value">{{ rounded() }}%</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.78rem;
      font-variant-numeric: tabular-nums;
      color: inherit;
    }
    .battery__bars {
      display: inline-flex;
      gap: 2px;
      height: 0.72rem;
    }
    i {
      width: 2.5px;
      border-radius: 1px;
      background: color-mix(in srgb, currentColor 22%, transparent);
    }
    i.on {
      background: var(--success);
    }
    :host([data-level='mid']) i.on { background: var(--warning); }
    :host([data-level='low']) i.on { background: var(--danger); }
  `,
})
export class BatteryBarsComponent {
  readonly value = input.required<number>();
  readonly showLabel = input(true);
  protected readonly bars = [0, 1, 2, 3, 4];
  protected readonly rounded = computed(() => Math.round(this.value()));
  protected readonly filled = computed(() => Math.max(this.value() > 2 ? 1 : 0, Math.round((this.value() / 100) * 5)));
  protected readonly level = computed(() => (this.value() < 15 ? 'low' : this.value() < 35 ? 'mid' : 'ok'));
}
