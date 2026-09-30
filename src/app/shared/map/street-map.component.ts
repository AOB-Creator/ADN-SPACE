import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import { FleetSimService } from '../../core/sim/fleet-sim.service';
import { Vec2, World } from '../../core/sim/world';
import { findRoute, splitPath } from '../../core/sim/pathfinding';

interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface StaticGeometry {
  parcels: string;
  buildings: string;
  trees: string;
  roadLabels: { key: string; name: string; pos: Vec2; vertical: boolean; main: boolean }[];
}

let geometryCache: StaticGeometry | null = null;

function buildGeometry(w: World): StaticGeometry {
  if (geometryCache) return geometryCache;
  const f = (n: number) => Math.round(n * 10) / 10;
  let parcels = '';
  for (const b of w.blocks) {
    for (let k = 0; k < b.lines.length; k += 4) {
      parcels += `M${f(b.lines[k])} ${f(b.lines[k + 1])}L${f(b.lines[k + 2])} ${f(b.lines[k + 3])}`;
    }
  }
  let buildings = '';
  for (const b of w.buildings) {
    buildings += `M${f(b.x - b.w / 2)} ${f(b.y - b.d / 2)}h${f(b.w)}v${f(b.d)}h${f(-b.w)}z`;
  }
  let trees = '';
  for (const t of w.trees) {
    const r = f(t.r * 0.8);
    trees += `M${f(t.x - r)} ${f(t.y)}a${r} ${r} 0 1 0 ${f(r * 2)} 0a${r} ${r} 0 1 0 ${f(-r * 2)} 0`;
  }
  const roadLabels: StaticGeometry['roadLabels'] = [];
  for (const r of w.roads) {
    if (r.axis === 'y') {
      // horizontal road: label a few block-midpoints along it
      for (let i = 1; i < w.xs.length - 1; i += 3) {
        const x = (w.xs[i] + w.xs[i + 1]) / 2;
        roadLabels.push({ key: `${r.name}-${i}`, name: r.name, pos: { x, y: r.at }, vertical: false, main: r.main });
      }
    } else {
      for (let j = 1; j < w.ys.length - 1; j += 3) {
        const y = (w.ys[j] + w.ys[j + 1]) / 2;
        roadLabels.push({ key: `${r.name}-${j}`, name: r.name, pos: { x: r.at, y }, vertical: true, main: r.main });
      }
    }
  }
  geometryCache = { parcels, buildings, trees, roadLabels };
  return geometryCache;
}

let uid = 0;

/**
 * Flat street map of the simulated city. Static geometry is SVG in world units;
 * everything that must stay a constant on-screen size (labels, drone markers)
 * lives in an HTML overlay positioned every animation frame.
 */
@Component({
  selector: 'app-street-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './street-map.component.html',
  styleUrl: './street-map.component.scss',
})
export class StreetMapComponent {
  private readonly sim = inject(FleetSimService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly missionId = input<string | null>(null);
  readonly follow = model(false);
  readonly insets = input<Insets>({ top: 0, right: 0, bottom: 0, left: 0 });
  readonly compact = input(false);
  readonly droneSelect = output<string>();

  private readonly svgRef = viewChild.required<ElementRef<SVGSVGElement>>('svg');
  private readonly overlayRef = viewChild.required<ElementRef<HTMLElement>>('overlay');
  private readonly doneRef = viewChild.required<ElementRef<SVGPathElement>>('done');
  private readonly restRef = viewChild.required<ElementRef<SVGPathElement>>('rest');
  private readonly casingRef = viewChild.required<ElementRef<SVGPathElement>>('casing');

  protected readonly world = this.sim.world;
  protected readonly geo = buildGeometry(this.sim.world);
  protected readonly hatchId = `hatch-${++uid}`;
  protected readonly zones = computed(() => {
    this.sim.tick();
    return [...this.sim.zones];
  });

  private width = 1;
  private height = 1;
  private view = { cx: 1200, cy: 800, scale: 0.5 };
  private goal = { cx: 1200, cy: 800, scale: 0.5 };
  private readonly items = new Map<string, HTMLElement>();
  private previewCache = new Map<string, Vec2[]>();
  private lastViewBox = '';
  private lastRouteKey = '';

  constructor() {
    afterNextRender(() => this.setup());
    effect(() => {
      const id = this.missionId();
      untracked(() => {
        this.lastRouteKey = '';
        this.fitRoute(this.width > 1);
        if (id) this.follow.set(false);
      });
    });
  }

  // ---- public controls -------------------------------------------------------

  zoomBy(factor: number) {
    this.goal.scale = clamp(this.goal.scale * factor, 0.18, 4);
  }

  fitRoute(animate = true) {
    const pts = this.routePoints();
    if (!pts.length) {
      this.fitWorld(animate);
      return;
    }
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    this.fitBox(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), 140, animate);
  }

  fitWorld(animate = true) {
    this.fitBox(0, 0, this.world.width, this.world.height, 40, animate);
  }

  // ---- setup -----------------------------------------------------------------

  private setup() {
    const el = this.host.nativeElement;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const first = this.width <= 1;
      this.width = Math.max(1, r.width);
      this.height = Math.max(1, r.height);
      if (first) this.fitRoute(false);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    this.bindPointer(el);
    const stop = this.sim.onFrame(() => this.frame());
    this.frame();
    this.destroyRef.onDestroy(() => {
      stop();
      ro.disconnect();
    });
  }

  private bindPointer(el: HTMLElement) {
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    const svg = this.svgRef().nativeElement;
    svg.addEventListener('pointerdown', (e) => {
      svg.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      el.classList.add('dragging');
    });
    svg.addEventListener('pointermove', (e) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) this.zoomBy(dist / pinch);
        pinch = dist;
        return;
      }
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 0 && this.follow()) this.follow.set(false);
      this.goal.cx -= dx / this.view.scale;
      this.goal.cy -= dy / this.view.scale;
      this.view.cx = this.goal.cx;
      this.view.cy = this.goal.cy;
    });
    const end = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      pinch = 0;
      if (!pointers.size) el.classList.remove('dragging');
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    svg.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const before = this.toWorld(e.clientX - rect.left, e.clientY - rect.top, this.goal);
        this.goal.scale = clamp(this.goal.scale * Math.exp(-e.deltaY * 0.0015), 0.18, 4);
        const after = this.toWorld(e.clientX - rect.left, e.clientY - rect.top, this.goal);
        if (!this.follow()) {
          this.goal.cx += before.x - after.x;
          this.goal.cy += before.y - after.y;
        }
      },
      { passive: false },
    );
  }

  // ---- geometry helpers -------------------------------------------------------

  private toWorld(sx: number, sy: number, v = this.view): Vec2 {
    return { x: v.cx + (sx - this.width / 2) / v.scale, y: v.cy + (sy - this.height / 2) / v.scale };
  }

  private toScreen(p: Vec2) {
    const v = this.view;
    return { x: (p.x - v.cx) * v.scale + this.width / 2, y: (p.y - v.cy) * v.scale + this.height / 2 };
  }

  /** Screen-space centre of the area not covered by overlay panels. */
  private freeCentre() {
    const i = this.insets();
    return {
      x: i.left + (this.width - i.left - i.right) / 2,
      y: i.top + (this.height - i.top - i.bottom) / 2,
      w: Math.max(120, this.width - i.left - i.right),
      h: Math.max(120, this.height - i.top - i.bottom),
    };
  }

  private fitBox(x0: number, y0: number, x1: number, y1: number, pad: number, animate: boolean) {
    const free = this.freeCentre();
    const scale = clamp(Math.min(free.w / (x1 - x0 + pad * 2), free.h / (y1 - y0 + pad * 2)), 0.18, 1.6);
    const cx = (x0 + x1) / 2 - (free.x - this.width / 2) / scale;
    const cy = (y0 + y1) / 2 - (free.y - this.height / 2) / scale;
    this.goal = { cx, cy, scale };
    if (!animate) this.view = { ...this.goal };
  }

  private mission() {
    return this.sim.mission(this.missionId());
  }

  /** The polyline for the selected mission: live path while flying, a preview while queued. */
  private missionPath(): { path: Vec2[]; travelled: number } | null {
    const m = this.mission();
    if (!m) return null;
    const d = this.sim.drone(m.droneId);
    if (d && d.missionId === m.id && d.path) return { path: d.path, travelled: d.travelled };
    if (m.status === 'scheduled') {
      let p = this.previewCache.get(m.id);
      if (!p) {
        p = findRoute(this.world, this.sim.warehouse(m.originId).pad, m.destination.pos, new Set());
        this.previewCache.set(m.id, p);
      }
      return { path: p, travelled: 0 };
    }
    return null;
  }

  private routePoints(): Vec2[] {
    const m = this.mission();
    if (!m) return [];
    const route = this.missionPath();
    const pts = route ? [...route.path] : [];
    pts.push(this.sim.warehouse(m.originId).pad, m.destination.pos);
    const d = this.sim.drone(m.droneId);
    if (d) pts.push(d.pos);
    return pts;
  }

  // ---- per-frame ------------------------------------------------------------------

  private frame() {
    const m = this.mission();
    const d = m ? this.sim.drone(m.droneId) : undefined;

    if (this.follow() && d) {
      const free = this.freeCentre();
      this.goal.cx = d.pos.x - (free.x - this.width / 2) / this.goal.scale;
      this.goal.cy = d.pos.y - (free.y - this.height / 2) / this.goal.scale;
    }
    const k = 0.14;
    this.view.scale += (this.goal.scale - this.view.scale) * k;
    this.view.cx += (this.goal.cx - this.view.cx) * k;
    this.view.cy += (this.goal.cy - this.view.cy) * k;

    const vw = this.width / this.view.scale;
    const vh = this.height / this.view.scale;
    const vb = `${(this.view.cx - vw / 2).toFixed(2)} ${(this.view.cy - vh / 2).toFixed(2)} ${vw.toFixed(2)} ${vh.toFixed(2)}`;
    if (vb !== this.lastViewBox) {
      this.lastViewBox = vb;
      this.svgRef().nativeElement.setAttribute('viewBox', vb);
    }

    this.drawRoute();
    this.drawOverlay(m?.id ?? null, d?.id ?? null);
  }

  private drawRoute() {
    const route = this.missionPath();
    const done = this.doneRef().nativeElement;
    const rest = this.restRef().nativeElement;
    const casing = this.casingRef().nativeElement;
    if (!route) {
      if (this.lastRouteKey !== 'none') {
        this.lastRouteKey = 'none';
        done.setAttribute('d', '');
        rest.setAttribute('d', '');
        casing.setAttribute('d', '');
      }
      return;
    }
    const key = `${route.path.length}:${route.travelled.toFixed(1)}:${route.path[route.path.length - 1].x}`;
    if (key === this.lastRouteKey) return;
    this.lastRouteKey = key;
    const [a, b] = splitPath(route.path, route.travelled);
    const toD = (pts: Vec2[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('');
    done.setAttribute('d', route.travelled > 0 ? toD(a) : '');
    rest.setAttribute('d', toD(b));
    casing.setAttribute('d', toD(route.path));
    rest.classList.toggle('is-preview', this.mission()?.status === 'scheduled');
  }

  private drawOverlay(missionId: string | null, focusId: string | null) {
    const overlay = this.overlayRef().nativeElement;
    const seen = new Set<string>();
    const margin = 60;
    const place = (key: string, p: Vec2, make: () => HTMLElement, always = false) => {
      const s = this.toScreen(p);
      if (!always && (s.x < -margin || s.y < -margin || s.x > this.width + margin || s.y > this.height + margin)) return null;
      seen.add(key);
      let el = this.items.get(key);
      if (!el) {
        el = make();
        this.items.set(key, el);
        overlay.appendChild(el);
      }
      el.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0)`;
      return el;
    };

    // street names (only when zoomed in enough to read them)
    const scale = this.view.scale;
    if (scale > 0.42) {
      for (const r of this.geo.roadLabels) {
        if (!r.main && scale < 0.62) continue;
        place(`r:${r.key}`, r.pos, () => {
          const el = document.createElement('span');
          el.className = `m-road${r.vertical ? ' m-road--v' : ''}${r.main ? ' m-road--main' : ''}`;
          el.textContent = r.name;
          return el;
        });
      }
    }

    for (const wh of this.world.warehouses) {
      place(`w:${wh.id}`, wh.pad, () => {
        const el = document.createElement('span');
        el.className = 'm-hub';
        el.textContent = wh.id;
        return el;
      });
    }

    for (const z of this.sim.zones) {
      place(`z:${z.id}`, z.center, () => {
        const el = document.createElement('span');
        el.className = 'm-zone';
        el.innerHTML =
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3.5c.6 0 1.1.3 1.4.8l8 14c.6 1-.1 2.2-1.3 2.2H3.9c-1.2 0-1.9-1.2-1.3-2.2l8-14c.3-.5.8-.8 1.4-.8z"/><path d="M12 9.5v4.5M12 17v.01" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg><b></b>';
        el.querySelector('b')!.textContent = z.id;
        return el;
      });
    }

    for (const d of this.sim.drones) {
      if (d.id === focusId) continue;
      if (d.status !== 'flying' && d.status !== 'returning') continue;
      const el = place(`d:${d.id}`, d.pos, () => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'm-drone';
        b.title = d.id;
        b.setAttribute('aria-label', d.id);
        b.addEventListener('click', () => this.droneSelect.emit(d.id));
        return b;
      });
      if (el) el.classList.toggle('m-drone--ret', d.status === 'returning');
    }

    const m = this.sim.mission(missionId);
    if (m) {
      const origin = this.sim.warehouse(m.originId);
      place(`o:${m.id}`, origin.pad, () => {
        const el = document.createElement('span');
        el.className = 'm-origin';
        return el;
      });
      place(`t:${m.id}`, m.destination.pos, () => {
        const el = document.createElement('span');
        el.className = 'm-dest';
        el.innerHTML = '<i></i><b></b>';
        el.querySelector('b')!.textContent = m.destination.label;
        return el;
      });
      const d = this.sim.drone(focusId);
      if (d && d.status !== 'idle' && d.status !== 'charging' && d.status !== 'maintenance') {
        const el = place(
          `f:${d.id}`,
          d.pos,
          () => {
            const wrap = document.createElement('span');
            wrap.className = 'm-focus';
            wrap.innerHTML =
              '<i class="m-focus__pulse"></i><span class="m-focus__body"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l6 16-6-3.5L6 19z" fill="currentColor"/></svg></span>';
            return wrap;
          },
          true,
        );
        const arrow = el?.querySelector('svg') as SVGElement | null;
        if (arrow) arrow.style.transform = `rotate(${((d.heading * 180) / Math.PI + 90).toFixed(1)}deg)`;
        el?.classList.toggle('m-focus--alert', m.status === 'deviation');
      }
    }

    for (const [key, el] of this.items) {
      if (!seen.has(key)) {
        el.remove();
        this.items.delete(key);
      }
    }
  }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
