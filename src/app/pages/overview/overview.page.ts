import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';
import { ThemeService } from '../../shared/theme.service';
import { FleetSimService } from '../../core/sim/fleet-sim.service';
import { OverviewLayer, UiStateService } from '../../core/ui-state.service';
import { CityRenderer } from '../../core/three/city-renderer';
import { IconComponent, IconName } from '../../shared/icon.component';
import { StatusDotComponent, Tone } from '../../shared/ui/status-dot.component';
import { BatteryBarsComponent } from '../../shared/ui/battery-bars.component';
import { droneTone } from '../../core/sim/present';
import { DroneStatus, Mission, SimNotification } from '../../core/sim/models';

const STATUS_ORDER: Record<DroneStatus, number> = { flying: 0, returning: 1, charging: 2, idle: 3, maintenance: 4 };

@Component({
  selector: 'app-overview-page',
  standalone: true,
  imports: [RouterLink, IconComponent, StatusDotComponent, BatteryBarsComponent],
  templateUrl: './overview.page.html',
  styleUrl: './overview.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewPage {
  protected readonly i18n = inject(I18nService);
  protected readonly sim = inject(FleetSimService);
  protected readonly ui = inject(UiStateService);
  private readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly stageRef = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly tagsRef = viewChild.required<ElementRef<HTMLElement>>('tags');
  private readonly dockRef = viewChild<ElementRef<HTMLElement>>('dock');

  private renderer?: CityRenderer;
  private readonly tags = new Map<string, HTMLElement>();

  protected readonly hovered = signal<string | null>(null);
  protected readonly layersOpen = signal(false);
  protected readonly fullscreen = signal(false);

  protected readonly layerKeys: { key: OverviewLayer; icon: IconName }[] = [
    { key: 'aerial', icon: 'map' },
    { key: 'routes', icon: 'route' },
    { key: 'weather', icon: 'cloud' },
    { key: 'drones', icon: 'drone' },
    { key: 'zones', icon: 'alert-triangle' },
  ];
  protected readonly allLayers = computed(() => Object.values(this.ui.layers()).every(Boolean));

  protected readonly online = computed(() => {
    const c = this.sim.counts();
    return c.all - c.maintenance;
  });

  protected readonly droneRows = computed(() => {
    this.sim.tick();
    return [...this.sim.drones]
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.battery - a.battery)
      .slice(0, 14);
  });

  protected readonly routeRows = computed(() => {
    this.sim.tick();
    const live = this.sim.missions.filter(
      (m) => m.status === 'flying' || m.status === 'deviation' || m.status === 'lowBattery',
    );
    const done = this.sim.missions
      .filter((m) => m.status === 'delivered')
      .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0))
      .slice(0, 4);
    return [...live.sort((a, b) => a.eta - b.eta), ...done];
  });

  protected readonly noteRows = computed(() => {
    this.sim.tick();
    return this.sim.notifications.slice(0, 10);
  });

  protected readonly droneTone = droneTone;

  constructor() {
    afterNextRender(() => this.setup());
    effect(() => this.renderer?.setTheme(this.theme.theme() === 'dark'));
    effect(() => this.renderer?.setLayers(this.ui.layers()));
    effect(() => this.renderer?.setFocus(this.hovered()));
  }

  // ---- template helpers ------------------------------------------------------

  protected routeNote(m: Mission): { text: string; tone: Tone } {
    const t = this.i18n.a();
    if (m.status === 'delivered') return { text: t.missionStatus.delivered, tone: 'accent' };
    if (m.status === 'deviation') return { text: t.notes.rerouting, tone: 'danger' };
    if (m.status === 'lowBattery') return { text: t.missionStatus.lowBattery, tone: 'warning' };
    if (Math.abs(m.delay) >= 60) return { text: this.i18n.delta(m.delay), tone: m.delay > 0 ? 'danger' : 'success' };
    return { text: t.notes.onTime, tone: 'success' };
  }

  protected noteText(n: SimNotification) {
    const tpl = this.i18n.a().notifications.kinds[n.kind];
    return { title: this.i18n.f(tpl.title, n.params), body: this.i18n.f(tpl.body, n.params) };
  }

  protected noteIcon(n: SimNotification): IconName {
    if (n.kind === 'deviation') return 'alert-triangle';
    if (n.kind === 'battery') return 'bolt';
    if (n.kind === 'offline' || n.kind === 'cancelled') return 'x-circle';
    if (n.kind === 'returning' || n.kind === 'reassigned') return 'refresh';
    return 'check-circle';
  }

  protected toggleAll() {
    this.ui.setAllLayers(!this.allLayers());
  }

  protected zoom(factor: number) {
    this.renderer?.zoomBy(factor);
  }

  protected rotate(radians: number) {
    this.renderer?.rotateBy(radians);
  }

  protected reset() {
    this.renderer?.resetView();
  }

  protected toggleFullscreen() {
    const el = this.host.nativeElement;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }

  // ---- 3D stage ----------------------------------------------------------------

  private setup() {
    const canvas = this.canvasRef().nativeElement;
    const stage = this.stageRef().nativeElement;
    const renderer = new CityRenderer(canvas, this.sim, { mode: 'iso', shadows: true, routes: 'all' });
    this.renderer = renderer;
    renderer.setTheme(this.theme.theme() === 'dark');
    renderer.setLayers(this.ui.layers());

    const applySize = () => {
      const rect = stage.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height);
      const dock = this.dockRef()?.nativeElement;
      const overlaps = dock && getComputedStyle(dock).position === 'absolute';
      renderer.setBottomInset(overlaps ? dock.getBoundingClientRect().height + 24 : 0);
    };
    applySize();
    const observer = new ResizeObserver(applySize);
    observer.observe(stage);
    const dock = this.dockRef()?.nativeElement;
    if (dock) observer.observe(dock);

    const onFs = () => this.fullscreen.set(document.fullscreenElement === this.host.nativeElement);
    document.addEventListener('fullscreenchange', onFs);

    this.bindPointer(canvas);

    let last = performance.now();
    const stop = this.sim.onFrame(() => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      renderer.render(dt);
      this.syncTags(stage);
    });

    this.destroyRef.onDestroy(() => {
      stop();
      observer.disconnect();
      document.removeEventListener('fullscreenchange', onFs);
      renderer.dispose();
      this.renderer = undefined;
    });
  }

  private bindPointer(canvas: HTMLCanvasElement) {
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch = 0;

    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      canvas.classList.add('dragging');
    });
    canvas.addEventListener('pointermove', (e) => {
      const prev = pointers.get(e.pointerId);
      if (!prev || !this.renderer) return;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) this.renderer.zoomBy(dist / pinch);
        pinch = dist;
        return;
      }
      if (e.shiftKey || e.buttons === 2) this.renderer.rotateBy(dx * 0.006);
      else this.renderer.pan(dx, dy);
    });
    const end = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      pinch = 0;
      if (!pointers.size) canvas.classList.remove('dragging');
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.renderer?.zoomBy(Math.exp(-e.deltaY * 0.0015));
      },
      { passive: false },
    );
  }

  /** HTML tags pinned to drones, hubs and no-fly zones, positioned every frame without change detection. */
  private syncTags(stage: HTMLElement) {
    const r = this.renderer;
    if (!r) return;
    const layers = this.ui.layers();
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    const seen = new Set<string>();

    const place = (key: string, pos: { x: number; y: number } | null, make: () => HTMLElement) => {
      if (!pos || pos.x < -80 || pos.y < -40 || pos.x > w + 80 || pos.y > h + 40) return;
      seen.add(key);
      let el = this.tags.get(key);
      if (!el) {
        el = make();
        this.tags.set(key, el);
        this.tagsRef().nativeElement.appendChild(el);
      }
      el.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0)`;
      return el;
    };

    if (layers.drones) {
      for (const d of this.sim.drones) {
        if (d.status !== 'flying' && d.status !== 'returning') continue;
        const el = place(`d:${d.id}`, r.droneScreen(d.id), () => this.makeDroneTag(d.id));
        if (!el) continue;
        const m = this.sim.mission(d.missionId);
        const tone = m?.status === 'deviation' ? 'danger' : m?.status === 'lowBattery' ? 'warning' : d.status;
        if (el.dataset['tone'] !== tone) el.dataset['tone'] = tone;
        el.classList.toggle('is-hover', this.hovered() === d.id);
      }
    }
    if (layers.aerial) {
      for (const wh of this.sim.world.warehouses) {
        place(`w:${wh.id}`, r.project(wh.pad, 34), () => {
          const el = document.createElement('span');
          el.className = 'tag tag--hub';
          el.innerHTML = `<b></b><span></span>`;
          el.querySelector('b')!.textContent = wh.id;
          el.querySelector('span')!.textContent = wh.name;
          return el;
        });
      }
    }
    if (layers.zones) {
      for (const z of this.sim.zones) {
        place(`z:${z.id}`, r.project(z.center, 34), () => {
          const el = document.createElement('span');
          el.className = 'tag tag--zone';
          el.textContent = z.id;
          return el;
        });
      }
    }

    for (const [key, el] of this.tags) {
      if (!seen.has(key)) {
        el.remove();
        this.tags.delete(key);
      }
    }
  }

  private makeDroneTag(id: string) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'tag tag--drone';
    el.textContent = id;
    el.addEventListener('pointerenter', () => this.hovered.set(id));
    el.addEventListener('pointerleave', () => this.hovered.set(null));
    el.addEventListener('click', () => {
      const d = this.sim.drone(id);
      if (d?.missionId) void this.router.navigate(['/missions', d.missionId]);
      else void this.router.navigate(['/fleet', id]);
    });
    return el;
  }
}
