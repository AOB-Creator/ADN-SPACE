import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Start dot → travelled line → diamond (current position) → remaining line → end dot. */
@Component({
  selector: 'app-route-track',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'track' },
  template: `
    <span class="track__start"></span>
    <span class="track__rail"></span>
    <span class="track__done" [style.width.%]="pct()"></span>
    <span class="track__marker" [style.left.%]="pct()"></span>
    <span class="track__end"></span>
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      height: 10px;
      color: var(--text-hi);
    }
    .track__rail,
    .track__done {
      position: absolute;
      top: 50%;
      left: 0;
      height: 1.5px;
      transform: translateY(-50%);
    }
    .track__rail {
      right: 0;
      background: color-mix(in srgb, currentColor 16%, transparent);
    }
    .track__done {
      background: currentColor;
      transition: width 0.25s linear;
    }
    .track__start,
    .track__end {
      position: absolute;
      top: 50%;
      width: 5px;
      height: 5px;
      border-radius: 999px;
      transform: translateY(-50%);
    }
    .track__start {
      left: -1px;
      background: currentColor;
    }
    .track__end {
      right: -1px;
      background: color-mix(in srgb, currentColor 22%, transparent);
    }
    .track__marker {
      position: absolute;
      top: 50%;
      width: 8px;
      height: 8px;
      background: currentColor;
      transform: translate(-50%, -50%) rotate(45deg);
      border-radius: 1px;
      transition: left 0.25s linear;
    }
  `,
})
export class RouteTrackComponent {
  readonly progress = input.required<number>();
  protected readonly pct = computed(() => Math.max(0, Math.min(100, this.progress() * 100)));
}
