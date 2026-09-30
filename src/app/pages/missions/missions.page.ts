import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';
import { FleetSimService } from '../../core/sim/fleet-sim.service';
import { UiStateService } from '../../core/ui-state.service';
import { ShellService } from '../../shell/shell.service';
import { IconComponent } from '../../shared/icon.component';
import { StatusDotComponent } from '../../shared/ui/status-dot.component';
import { BatteryBarsComponent } from '../../shared/ui/battery-bars.component';
import { RouteTrackComponent } from '../../shared/ui/route-track.component';
import { PayloadBarComponent } from '../../shared/ui/payload-bar.component';
import { AttitudeComponent, CompassComponent } from '../../shared/ui/instruments.component';
import { StreetMapComponent } from '../../shared/map/street-map.component';
import { CityViewComponent } from '../../shared/map/city-view.component';
import { destinationTone, missionTone, originNote } from '../../core/sim/present';
import { DroneState, Mission } from '../../core/sim/models';

const HISTORY = 48;
type Metric = 'alt' | 'wgh' | 'spd' | 'pwr';

@Component({
  selector: 'app-missions-page',
  standalone: true,
  imports: [
    RouterLink,
    IconComponent,
    StatusDotComponent,
    BatteryBarsComponent,
    RouteTrackComponent,
    PayloadBarComponent,
    AttitudeComponent,
    CompassComponent,
    StreetMapComponent,
    CityViewComponent,
  ],
  templateUrl: './missions.page.html',
  styleUrl: './missions.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.has-detail]': 'hasDetail()',
  },
})
export class MissionsPage {
  protected readonly i18n = inject(I18nService);
  protected readonly sim = inject(FleetSimService);
  protected readonly ui = inject(UiStateService);
  private readonly shell = inject(ShellService);
  private readonly router = inject(Router);

  /** Route param: a mission id, `live`, or absent. */
  readonly id = input<string>();

  protected readonly map = viewChild(StreetMapComponent);
  protected readonly mobile = signal(false);
  protected readonly follow = signal(false);
  protected readonly menuFor = signal<string | null>(null);
  protected readonly sheetOpen = signal(true);

  protected readonly missionTone = missionTone;
  protected readonly destinationTone = destinationTone;
  protected readonly originNote = originNote;

  /** On phones the list and the map are separate screens. */
  protected readonly hasDetail = computed(() => !!this.id());

  protected readonly operations = computed(() => {
    this.sim.tick();
    const q = this.ui.search().trim().toLowerCase();
    const rank = (m: Mission) => (m.status === 'deviation' ? 0 : m.status === 'lowBattery' ? 1 : m.status === 'scheduled' ? 3 : 2);
    return this.sim.missions
      .filter((m) => this.sim.isActive(m))
      .filter((m) => {
        if (!q) return true;
        const o = this.sim.order(m.orderId);
        return [m.id, m.droneId ?? '', m.destination.label, o?.customer ?? '', o?.id ?? '']
          .some((s) => s.toLowerCase().includes(q));
      })
      .sort((a, b) => rank(a) - rank(b) || a.eta - b.eta || a.id.localeCompare(b.id));
  });

  protected readonly selectedId = computed(() => {
    const id = this.id();
    if (id && id !== 'live' && this.sim.mission(id)) return id;
    return this.ui.selectedMissionId();
  });

  protected readonly selected = computed(() => {
    this.sim.tick();
    return this.sim.mission(this.selectedId());
  });

  protected readonly drone = computed(() => {
    const m = this.selected();
    return m ? this.sim.drone(m.droneId) : undefined;
  });

  /** Drone is on this mission (not already returning home after delivery). */
  protected readonly onMission = computed(() => {
    const m = this.selected();
    const d = this.drone();
    return !!m && !!d && d.missionId === m.id;
  });

  protected readonly history: Record<Metric, number[]> = { alt: [], wgh: [], spd: [], pwr: [] };
  private historyFor: string | null = null;

  protected readonly telemetry = computed(() => {
    this.sim.tick();
    const d = this.drone();
    if (!d) return null;
    return {
      alt: d.alt,
      wgh: d.payload,
      spd: d.speed,
      pwr: d.battery,
      heading: (((d.heading * 180) / Math.PI + 90) % 360 + 360) % 360,
      pitch: d.status === 'flying' || d.status === 'returning' ? d.pitch : 0,
      roll: d.status === 'flying' || d.status === 'returning' ? d.roll : 0,
    };
  });

  protected readonly mapInsets = computed(() =>
    this.mobile()
      ? { top: 70, right: 16, bottom: this.sheetOpen() ? 330 : 90, left: 16 }
      : { top: 70, right: 290, bottom: 290, left: 30 },
  );

  constructor() {
    const mq = matchMedia('(max-width: 899px)');
    this.mobile.set(mq.matches);
    const onMq = () => this.mobile.set(mq.matches);
    mq.addEventListener('change', onMq);
    inject(DestroyRef).onDestroy(() => {
      mq.removeEventListener('change', onMq);
      this.shell.reset();
    });

    // keep a valid selection when the URL doesn't name one
    effect(() => {
      this.sim.tick();
      const id = this.id();
      untracked(() => {
        if (id && id !== 'live' && this.sim.mission(id)) {
          this.ui.selectedMissionId.set(id);
          return;
        }
        const current = this.sim.mission(this.ui.selectedMissionId());
        if (current && current.droneId && this.sim.isActive(current)) return;
        const first = this.operations().find((m) => m.status !== 'scheduled') ?? this.operations()[0];
        this.ui.selectedMissionId.set(first?.id ?? null);
      });
    });

    // rolling telemetry history for the sparklines
    effect(() => {
      const t = this.telemetry();
      const id = untracked(() => this.drone()?.id ?? null);
      if (id !== this.historyFor) {
        this.historyFor = id;
        (Object.keys(this.history) as Metric[]).forEach((k) => (this.history[k] = []));
      }
      if (!t) return;
      (Object.keys(this.history) as Metric[]).forEach((k) => {
        const h = this.history[k];
        h.push(t[k]);
        if (h.length > HISTORY) h.shift();
      });
    });

    // mobile detail view: mission id as title + back button
    effect(() => {
      const m = this.selected();
      if (this.mobile() && this.hasDetail() && m) this.shell.set(m.id, '/missions');
      else this.shell.reset();
    });
  }

  // ---- helpers -------------------------------------------------------------------

  protected droneOf(m: Mission): DroneState | undefined {
    return this.sim.drone(m.droneId);
  }

  protected progress(m: Mission) {
    return this.sim.missionProgress(m);
  }

  protected startTime(m: Mission) {
    if (m.status === 'scheduled') return this.sim.order(m.orderId)?.notBefore ?? this.sim.simTime;
    return m.startedAt;
  }

  protected etaTime(m: Mission) {
    if (m.status === 'delivered') return m.finishedAt ?? this.sim.simTime;
    if (m.status === 'scheduled') return this.startTime(m) + 900;
    return this.sim.simTime + this.sim.missionEta(m);
  }

  protected remainingKm(m: Mission) {
    return (this.sim.missionRemaining(m) / 1000).toFixed(1);
  }

  protected spark(metric: Metric, max: number) {
    const h = this.history[metric];
    if (h.length < 2) return '';
    const step = 100 / (HISTORY - 1);
    const off = (HISTORY - h.length) * step;
    return h
      .map((v, i) => `${i ? 'L' : 'M'}${(off + i * step).toFixed(1)} ${(28 - (Math.min(v, max) / max) * 26).toFixed(1)}`)
      .join('');
  }

  protected cardinal(deg: number) {
    const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return names[Math.round(deg / 45) % 8];
  }

  protected select(m: Mission) {
    this.menuFor.set(null);
    void this.router.navigate(['/missions', m.id]);
  }

  protected selectDrone(droneId: string) {
    const d = this.sim.drone(droneId);
    if (d?.missionId) void this.router.navigate(['/missions', d.missionId]);
    else void this.router.navigate(['/fleet', droneId]);
  }

  protected toggleMenu(event: Event, id: string) {
    event.stopPropagation();
    event.preventDefault();
    this.menuFor.update((v) => (v === id ? null : id));
  }

  protected returnToBase(m: Mission) {
    this.menuFor.set(null);
    if (m.droneId) this.sim.returnToBase(m.droneId);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (this.menuFor() && !(e.target as HTMLElement).closest('.op__menu')) this.menuFor.set(null);
  }
}
