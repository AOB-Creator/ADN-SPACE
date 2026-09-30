import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Keeps a rotating dial from spinning the long way round when the angle wraps 359° → 0°. */
function unwrapper() {
  let last = 0;
  return (deg: number) => {
    let d = deg - (((last % 360) + 360) % 360);
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    last += d;
    return last;
  };
}

@Component({
  selector: 'app-attitude',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <clipPath [attr.id]="clip"><circle cx="50" cy="50" r="42" /></clipPath>
      </defs>
      <g [attr.clip-path]="'url(#' + clip + ')'">
        <g class="horizon" [style.transform]="horizon()">
          <rect x="-50" y="-100" width="200" height="150" class="sky" />
          <rect x="-50" y="50" width="200" height="150" class="ground" />
          <line x1="-50" y1="50" x2="150" y2="50" class="line" />
          @for (p of pitchMarks; track p) {
            <line [attr.x1]="p % 20 === 0 ? 40 : 44" [attr.x2]="p % 20 === 0 ? 60 : 56" [attr.y1]="50 - p * 1.4" [attr.y2]="50 - p * 1.4" class="mark" />
          }
        </g>
      </g>
      <circle cx="50" cy="50" r="42" class="ring" />
      <g class="bank" [style.transform]="'rotate(' + roll() + 'deg)'">
        <path d="M50 11 l-3.5 -5 h7z" class="pointer" />
      </g>
      @for (a of bankMarks; track a) {
        <line x1="50" y1="4" x2="50" [attr.y2]="a % 30 === 0 ? 10 : 8" class="tick" [attr.transform]="'rotate(' + a + ' 50 50)'" />
      }
      <path d="M28 50 h14 l4 5 M72 50 h-14 l-4 5" class="plane" />
      <circle cx="50" cy="50" r="2.2" class="plane-dot" />
    </svg>
  `,
  styles: `
    :host { display: block; aspect-ratio: 1; }
    svg { width: 100%; height: 100%; display: block; overflow: visible; }
    .horizon { transition: transform 0.25s linear; transform-origin: 50px 50px; }
    .sky { fill: color-mix(in srgb, var(--accent) 16%, var(--bg-elevated)); }
    .ground { fill: color-mix(in srgb, var(--text-hi) 12%, var(--bg-elevated)); }
    .line { stroke: var(--text-hi); stroke-width: 1.2; }
    .mark { stroke: var(--text-mid); stroke-width: 0.9; opacity: 0.7; }
    .ring { fill: none; stroke: var(--border-strong); stroke-width: 1.5; }
    .bank { transform-origin: 50px 50px; transition: transform 0.25s linear; }
    .pointer { fill: var(--accent); }
    .tick { stroke: var(--text-lo); stroke-width: 1.2; }
    .plane { fill: none; stroke: var(--warning); stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }
    .plane-dot { fill: var(--warning); }
  `,
})
export class AttitudeComponent {
  private static seq = 0;
  readonly pitch = input(0);
  readonly roll = input(0);
  protected readonly clip = `att-${++AttitudeComponent.seq}`;
  protected readonly pitchMarks = [-20, -10, 10, 20];
  protected readonly bankMarks = [-60, -45, -30, -15, 0, 15, 30, 45, 60];
  protected readonly horizon = computed(
    () => `rotate(${-this.roll()}deg) translateY(${Math.max(-30, Math.min(30, this.pitch() * 1.4))}px)`,
  );
}

@Component({
  selector: 'app-compass',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="44" class="face" />
      <g class="dial" [style.transform]="'rotate(' + dial() + 'deg)'">
        @for (a of ticks; track a) {
          <line x1="50" y1="8" x2="50" [attr.y2]="a % 90 === 0 ? 16 : a % 30 === 0 ? 13 : 11" [attr.transform]="'rotate(' + a + ' 50 50)'" [class.major]="a % 90 === 0" class="tick" />
        }
        @for (c of cardinals; track c.l) {
          <text [attr.x]="50" [attr.y]="26" [attr.transform]="'rotate(' + c.a + ' 50 50)'" [class.north]="c.l === 'N'">{{ c.l }}</text>
        }
      </g>
      <path d="M50 30 l7 22 -7 -4 -7 4z" class="needle" />
      <path d="M50 3 l-4 -3 h8z" class="index" transform="translate(0 4)" />
    </svg>
  `,
  styles: `
    :host { display: block; aspect-ratio: 1; }
    svg { width: 100%; height: 100%; display: block; overflow: visible; }
    .face { fill: var(--bg-raise); stroke: var(--border-strong); stroke-width: 1.5; }
    .dial { transform-origin: 50px 50px; transition: transform 0.25s linear; }
    .tick { stroke: var(--text-lo); stroke-width: 1; }
    .tick.major { stroke: var(--text-hi); stroke-width: 1.6; }
    text { font: 700 9px var(--font-body); fill: var(--text-mid); text-anchor: middle; }
    text.north { fill: var(--danger); }
    .needle { fill: var(--text-hi); }
    .index { fill: var(--accent); }
  `,
})
export class CompassComponent {
  /** Degrees clockwise from north. */
  readonly heading = input(0);
  private readonly unwrap = unwrapper();
  protected readonly ticks = Array.from({ length: 36 }, (_, k) => k * 10);
  protected readonly cardinals = [
    { l: 'N', a: 0 },
    { l: 'E', a: 90 },
    { l: 'S', a: 180 },
    { l: 'W', a: 270 },
  ];
  protected readonly dial = computed(() => -this.unwrap(this.heading()));
}
