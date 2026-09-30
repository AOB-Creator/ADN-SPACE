import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Solid bar for the carried load, hatched remainder for spare capacity: "1.4 /2.5 kg". */
@Component({
  selector: 'app-payload',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'payload', '[class.payload--large]': 'large()' },
  template: `
    <span class="payload__bar">
      <span class="payload__fill" [style.width.%]="pct()"></span>
    </span>
    <span class="payload__text"
      ><b>{{ value().toFixed(1) }}</b><span> /{{ max().toFixed(1) }} {{ unit() }}</span></span
    >
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      color: var(--text-hi);
    }
    .payload__bar {
      position: relative;
      flex: 1;
      height: 4px;
      background-image: repeating-linear-gradient(
        -60deg,
        color-mix(in srgb, currentColor 20%, transparent) 0 3px,
        transparent 3px 6px
      );
      border-radius: 2px;
    }
    .payload__fill {
      position: absolute;
      inset: 0 auto 0 0;
      background: currentColor;
      border-radius: 2px;
      transition: width 0.3s ease;
    }
    .payload__text {
      font-size: 0.74rem;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
      b {
        font-weight: 600;
      }
      span {
        color: color-mix(in srgb, currentColor 50%, transparent);
      }
    }
    :host(.payload--large) .payload__text {
      font-size: 1rem;
    }
  `,
})
export class PayloadBarComponent {
  readonly value = input.required<number>();
  readonly max = input.required<number>();
  readonly unit = input('kg');
  readonly large = input(false);
  protected readonly pct = computed(() => Math.min(100, (this.value() / this.max()) * 100));
}
