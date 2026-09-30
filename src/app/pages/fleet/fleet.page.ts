import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';
import { FleetSimService } from '../../core/sim/fleet-sim.service';
import { UiStateService } from '../../core/ui-state.service';
import { ShellService } from '../../shell/shell.service';
import { IconComponent } from '../../shared/icon.component';
import { StatusDotComponent } from '../../shared/ui/status-dot.component';
import { BatteryBarsComponent } from '../../shared/ui/battery-bars.component';
import { PayloadBarComponent } from '../../shared/ui/payload-bar.component';
import { DroneViewerComponent } from '../../shared/ui/drone-viewer.component';
import { droneTone } from '../../core/sim/present';
import { DroneModel, DroneState, DroneStatus, DroneVariant } from '../../core/sim/models';
import { toLatLng } from '../../core/sim/world';

type Tab = 'all' | 'flying' | 'idle' | 'charging' | 'maintenance';

@Component({
  selector: 'app-fleet-page',
  standalone: true,
  imports: [RouterLink, IconComponent, StatusDotComponent, BatteryBarsComponent, PayloadBarComponent, DroneViewerComponent],
  templateUrl: './fleet.page.html',
  styleUrl: './fleet.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.has-detail]': '!!id()' },
})
export class FleetPage {
  protected readonly i18n = inject(I18nService);
  protected readonly sim = inject(FleetSimService);
  private readonly ui = inject(UiStateService);
  private readonly shell = inject(ShellService);
  private readonly router = inject(Router);

  readonly id = input<string>();

  protected readonly tabs: Tab[] = ['all', 'flying', 'idle', 'charging', 'maintenance'];
  protected readonly tab = signal<Tab>('all');
  protected readonly modelFilter = signal<DroneModel | 'all'>('all');
  protected readonly registering = signal(false);
  protected readonly form = signal<{ model: DroneModel; variant: DroneVariant; home: string }>({
    model: 'Falcon-X2',
    variant: 'white',
    home: 'WH-01',
  });
  protected readonly mobile = signal(false);
  protected readonly droneTone = droneTone;

  protected readonly drones = computed(() => {
    this.sim.tick();
    const tab = this.tab();
    const model = this.modelFilter();
    const q = this.ui.search().trim().toLowerCase();
    const match = (s: DroneStatus) =>
      tab === 'all' || (tab === 'flying' ? s === 'flying' || s === 'returning' : s === tab);
    return this.sim.drones.filter(
      (d) =>
        match(d.status) &&
        (model === 'all' || d.model === model) &&
        (!q || d.id.toLowerCase().includes(q) || d.model.toLowerCase().includes(q) || d.serial.toLowerCase().includes(q)),
    );
  });

  protected readonly selected = computed(() => {
    this.sim.tick();
    return this.sim.drone(this.id() ?? this.ui.selectedDroneId()) ?? this.drones()[0] ?? this.sim.drones[0];
  });

  protected readonly details = computed(() => {
    const d = this.selected();
    if (!d) return null;
    const gps = toLatLng(d.pos, this.sim.world);
    return {
      gps: `${gps.lat.toFixed(5)}° N, ${gps.lng.toFixed(5)}° E`,
      mission: this.sim.mission(d.missionId),
      home: this.sim.warehouseLabel(d.homeId),
    };
  });

  constructor() {
    const mq = matchMedia('(max-width: 899px)');
    this.mobile.set(mq.matches);
    const onMq = () => this.mobile.set(mq.matches);
    mq.addEventListener('change', onMq);
    inject(DestroyRef).onDestroy(() => {
      mq.removeEventListener('change', onMq);
      this.shell.reset();
    });

    effect(() => {
      const id = this.id();
      if (id && this.sim.drone(id)) this.ui.selectedDroneId.set(id);
    });
    effect(() => {
      const d = this.selected();
      if (this.mobile() && this.id() && d) this.shell.set(d.id, '/fleet');
      else this.shell.reset();
    });
  }

  protected count(tab: Tab) {
    const c = this.sim.counts();
    return c[tab];
  }

  protected statusLabel(d: DroneState) {
    return this.i18n.a().droneStatus[d.status];
  }

  protected isAirborne(d: DroneState) {
    return d.status === 'flying' || d.status === 'returning';
  }

  protected open(d: DroneState) {
    void this.router.navigate(['/fleet', d.id]);
  }

  protected updateForm(patch: Partial<{ model: DroneModel; variant: DroneVariant; home: string }>) {
    this.form.update((f) => ({ ...f, ...patch }));
  }

  protected preview() {
    const f = this.form();
    return `images/drones/${f.model === 'Kestrel-V' ? 'kestrel' : 'falcon'}-${f.variant}.png`;
  }

  protected register() {
    const f = this.form();
    const id = this.sim.registerDrone(f.model, f.variant, f.home);
    this.registering.set(false);
    this.tab.set('all');
    void this.router.navigate(['/fleet', id]);
  }
}
