import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { FleetSimService } from '../../core/sim/fleet-sim.service';
import { CityMode, CityRenderer } from '../../core/three/city-renderer';
import { ThemeService } from '../theme.service';

/** Canvas host for a CityRenderer that tracks one drone (3D follow view or first-person feed). */
@Component({
  selector: 'app-city-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #canvas></canvas>`,
  styles: `
    :host {
      position: relative;
      display: block;
      overflow: hidden;
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
      touch-action: none;
    }
    :host(.interactive) canvas {
      cursor: grab;
    }
  `,
  host: { '[class.interactive]': "mode() === 'follow'" },
})
export class CityViewComponent {
  private readonly sim = inject(FleetSimService);
  private readonly theme = inject(ThemeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  readonly mode = input<CityMode>('follow');
  readonly droneId = input<string | null>(null);

  private renderer?: CityRenderer;

  constructor() {
    afterNextRender(() => this.setup());
    effect(() => this.renderer?.setTheme(this.theme.theme() === 'dark'));
    effect(() => this.renderer?.setFocus(this.droneId()));
  }

  zoomBy(f: number) {
    this.renderer?.zoomBy(f);
  }

  recenter() {
    this.renderer?.setFocus(this.droneId());
  }

  private setup() {
    const canvas = this.canvasRef().nativeElement;
    const mode = this.mode();
    const r = new CityRenderer(canvas, this.sim, { mode, shadows: mode === 'follow', routes: 'focus' });
    this.renderer = r;
    r.setTheme(this.theme.theme() === 'dark');
    r.setFocus(this.droneId());

    const el = this.host.nativeElement;
    const size = () => r.setSize(el.clientWidth, el.clientHeight);
    size();
    const ro = new ResizeObserver(size);
    ro.observe(el);

    if (mode === 'follow') {
      let last: { x: number; y: number } | null = null;
      canvas.addEventListener('pointerdown', (e) => {
        canvas.setPointerCapture(e.pointerId);
        last = { x: e.clientX, y: e.clientY };
      });
      canvas.addEventListener('pointermove', (e) => {
        if (!last) return;
        r.rotateBy((e.clientX - last.x) * 0.006);
        last = { x: e.clientX, y: e.clientY };
      });
      const end = () => (last = null);
      canvas.addEventListener('pointerup', end);
      canvas.addEventListener('pointercancel', end);
      canvas.addEventListener(
        'wheel',
        (e) => {
          e.preventDefault();
          r.zoomBy(Math.exp(-e.deltaY * 0.0015));
        },
        { passive: false },
      );
    }

    let prev = performance.now();
    const stop = this.sim.onFrame(() => {
      const now = performance.now();
      r.render(Math.min((now - prev) / 1000, 0.1));
      prev = now;
    });

    this.destroyRef.onDestroy(() => {
      stop();
      ro.disconnect();
      r.dispose();
      this.renderer = undefined;
    });
  }
}
