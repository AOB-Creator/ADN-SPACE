import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';
import { FleetSimService } from '../../core/sim/fleet-sim.service';
import { UiStateService } from '../../core/ui-state.service';
import { ShellService } from '../../shell/shell.service';
import { IconComponent } from '../../shared/icon.component';
import { StatusDotComponent } from '../../shared/ui/status-dot.component';
import { BatteryBarsComponent } from '../../shared/ui/battery-bars.component';
import { RouteTrackComponent } from '../../shared/ui/route-track.component';
import { StreetMapComponent } from '../../shared/map/street-map.component';
import { orderTone } from '../../core/sim/present';
import { Order, OrderStatus, Priority } from '../../core/sim/models';

type Tab = 'all' | 'active' | 'delivered' | 'cancelled';
type Dialog = 'reassign' | 'reschedule' | 'cancel' | 'new' | null;

@Component({
  selector: 'app-orders-page',
  standalone: true,
  imports: [RouterLink, IconComponent, StatusDotComponent, BatteryBarsComponent, RouteTrackComponent, StreetMapComponent],
  templateUrl: './orders.page.html',
  styleUrl: './orders.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.has-detail]': '!!id()' },
})
export class OrdersPage {
  protected readonly i18n = inject(I18nService);
  protected readonly sim = inject(FleetSimService);
  private readonly ui = inject(UiStateService);
  private readonly shell = inject(ShellService);
  private readonly router = inject(Router);

  readonly id = input<string>();
  /** `?new=1` opens the new-order dialog (used by "New delivery" on the missions page). */
  readonly newParam = input<string | undefined>(undefined, { alias: 'new' });

  protected readonly tabs: Tab[] = ['all', 'active', 'delivered', 'cancelled'];
  protected readonly tab = signal<Tab>('all');
  protected readonly dialog = signal<Dialog>(null);
  protected readonly pickDrone = signal<string | null>(null);
  protected readonly pickMinutes = signal(30);
  protected readonly minuteOptions = [15, 30, 60, 120];
  protected readonly draft = signal({
    customer: '',
    pickupId: 'WH-01',
    dropoff: 0,
    weight: 1.2,
    priority: 'standard' as Priority,
  });
  protected readonly mobile = signal(false);
  protected readonly orderTone = orderTone;

  protected readonly orders = computed(() => {
    this.sim.tick();
    const tab = this.tab();
    const q = this.ui.search().trim().toLowerCase();
    const inTab = (s: OrderStatus) =>
      tab === 'all' || (tab === 'active' ? s === 'inFlight' || s === 'scheduled' : s === tab);
    return this.sim.orders
      .filter((o) => inTab(o.status))
      .filter(
        (o) =>
          !q ||
          o.id.toLowerCase().includes(q) ||
          o.customer.toLowerCase().includes(q) ||
          o.dropoff.label.toLowerCase().includes(q),
      )
      .sort((a, b) => b.requestedAt - a.requestedAt);
  });

  protected readonly counts = computed(() => {
    this.sim.tick();
    const c: Record<Tab, number> = { all: 0, active: 0, delivered: 0, cancelled: 0 };
    for (const o of this.sim.orders) {
      c.all++;
      if (o.status === 'inFlight' || o.status === 'scheduled') c.active++;
      else c[o.status]++;
    }
    return c;
  });

  protected readonly selected = computed(() => {
    this.sim.tick();
    return this.sim.order(this.id() ?? this.ui.selectedOrderId()) ?? this.orders()[0];
  });

  protected readonly mission = computed(() => {
    const o = this.selected();
    return o ? this.sim.mission(o.missionId) : undefined;
  });

  protected readonly drone = computed(() => {
    const m = this.mission();
    return m ? this.sim.drone(m.droneId) : undefined;
  });

  protected readonly idle = computed(() => {
    this.sim.tick();
    return this.sim.idleDrones().sort((a, b) => b.battery - a.battery);
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
      if (id && this.sim.order(id)) this.ui.selectedOrderId.set(id);
    });
    effect(() => {
      if (this.newParam()) untracked(() => this.openNew());
    });
    effect(() => {
      const o = this.selected();
      if (this.mobile() && this.id() && o) this.shell.set(o.id, '/orders');
      else this.shell.reset();
    });
  }

  protected open(o: Order) {
    void this.router.navigate(['/orders', o.id]);
  }

  protected canChange(o: Order) {
    return o.status === 'scheduled' || o.status === 'inFlight';
  }

  protected openReassign() {
    this.pickDrone.set(this.idle()[0]?.id ?? null);
    this.dialog.set('reassign');
  }

  protected confirmReassign(o: Order) {
    const id = this.pickDrone();
    if (id) this.sim.reassignOrder(o.id, id);
    this.dialog.set(null);
  }

  protected confirmReschedule(o: Order) {
    this.sim.rescheduleOrder(o.id, this.pickMinutes());
    this.dialog.set(null);
  }

  protected confirmCancel(o: Order) {
    this.sim.cancelOrder(o.id);
    this.dialog.set(null);
  }

  protected openNew() {
    this.draft.set({ customer: '', pickupId: 'WH-01', dropoff: 0, weight: 1.2, priority: 'standard' });
    this.dialog.set('new');
  }

  protected patchDraft(patch: Partial<ReturnType<typeof this.draft>>) {
    this.draft.update((d) => ({ ...d, ...patch }));
  }

  protected createOrder() {
    const d = this.draft();
    const id = this.sim.placeOrder({
      customer: d.customer,
      pickupId: d.pickupId,
      dropoff: this.sim.world.addresses[d.dropoff],
      weight: Math.min(4.5, Math.max(0.1, Number(d.weight) || 1)),
      priority: d.priority,
    });
    this.dialog.set(null);
    this.tab.set('all');
    void this.router.navigate(['/orders', id]);
  }

  protected closeDialog() {
    this.dialog.set(null);
    if (this.newParam()) void this.router.navigate([], { queryParams: {} });
  }
}
