import { Injectable, computed, signal } from '@angular/core';
import { createRng } from './rng';
import { Address, NoFlyZone, Vec2, World, edgeKey, generateWorld } from './world';
import { findRoute, pathLength, pointAt } from './pathfinding';
import {
  Delivery,
  DroneModel,
  DroneState,
  DroneVariant,
  FleetCounts,
  Mission,
  NotificationKind,
  Order,
  SimNotification,
} from './models';

const START_CLOCK = 9 * 3600 + 18 * 60;
const BATTERY_PER_METER = 0.008;
const CHARGE_PER_SECOND = 0.2;
const LOW_BATTERY = 20;
const TARGET_IN_FLIGHT = 14;
const TARGET_QUEUE = 3;
const DEVIATION_EVERY = 210;
const ZONE_LIFETIME = 520;
const REPLAN_HOLD = 14;
const UI_INTERVAL_MS = 220;
const DAY_START = 6 * 3600;

const CUSTOMERS = [
  'A. Qudaybergenov',
  'N. Seytmuratova',
  'B. Jumabaev',
  'D. Allambergenova',
  'S. Tleumuratov',
  'G. Utepova',
  'R. Kalbaev',
  'Z. Nurlanova',
  'M. Aytmuratov',
  'K. Joldasbaeva',
  'E. Bekmuratov',
  'L. Esemuratova',
  'T. Kurbanbaev',
  'U. Sultanova',
];

const FIXED_IDS = [
  'AD 1149-4579',
  'SP 3415-2323',
  'AD 0968-1593',
  'SP 4367-1665',
  'AD 0238-3464',
  'AD 4567-2846',
  'AD 9235-1254',
  'AD 9242-1298',
  'AD 9267-9587',
  'AD 9296-0872',
  'SP 5489-1237',
  'AD 1140-1245',
  'AD 4575-4098',
];

@Injectable({ providedIn: 'root' })
export class FleetSimService {
  readonly world: World = generateWorld();

  /** Mutable live state — renderers read these directly every animation frame. */
  readonly drones: DroneState[] = [];
  readonly missions: Mission[] = [];
  readonly orders: Order[] = [];
  readonly zones: NoFlyZone[] = [...this.world.zones.filter((z) => !z.temporary)];
  readonly notifications: SimNotification[] = [];
  /** Completed deliveries today, oldest first (seeded with pre-session history). */
  readonly deliveries: Delivery[] = [];

  /** Bumped a few times per second so templates re-read the live state. */
  readonly tick = signal(0);
  readonly running = signal(true);
  readonly speed = signal(6);

  readonly clock = computed(() => {
    this.tick();
    return this.simTime;
  });

  readonly counts = computed<FleetCounts>(() => {
    this.tick();
    const c = { all: this.drones.length, flying: 0, idle: 0, charging: 0, maintenance: 0 };
    for (const d of this.drones) {
      if (d.status === 'flying' || d.status === 'returning') c.flying++;
      else if (d.status === 'idle') c.idle++;
      else if (d.status === 'charging') c.charging++;
      else c.maintenance++;
    }
    return c;
  });

  readonly activeOperations = computed(() => {
    this.tick();
    return this.missions.filter((m) => this.isActive(m));
  });

  readonly kpis = computed(() => {
    this.tick();
    const recent = this.deliveries.slice(-24);
    const avg = recent.reduce((s, d) => s + d.duration, 0) / Math.max(1, recent.length);
    const onTime = this.deliveries.filter((d) => d.delay <= 120).length / Math.max(1, this.deliveries.length);
    const inFlight = this.missions.filter(
      (m) => m.status === 'flying' || m.status === 'deviation' || m.status === 'lowBattery',
    ).length;
    return { avgDelivery: avg, onTimeRate: onTime, inFlight, deliveredToday: this.deliveries.length };
  });

  readonly unreadCount = computed(() => {
    this.tick();
    return this.notifications.filter((n) => !n.read).length;
  });

  simTime = START_CLOCK;

  private readonly rng = createRng(2026);
  private blocked = new Set<string>();
  private missionSeq = 4459;
  private orderSeq = 4471;
  private customerSeq = 81;
  private notificationSeq = 1;
  private zoneSeq = 0;
  private nextDeviation = START_CLOCK + 70;
  private dynamicZones: { zone: NoFlyZone; expires: number }[] = [];
  private lastFrame = 0;
  private lastUi = 0;
  private frame = 0;
  private readonly listeners = new Set<(dt: number) => void>();

  constructor() {
    this.rebuildBlocked();
    this.seed();
    if (typeof window !== 'undefined') {
      this.frame = requestAnimationFrame((t) => this.loop(t));
    }
  }

  // ---- public queries -------------------------------------------------------

  drone(id: string | null | undefined) {
    return id ? this.drones.find((d) => d.id === id) : undefined;
  }

  mission(id: string | null | undefined) {
    return id ? this.missions.find((m) => m.id === id) : undefined;
  }

  order(id: string | null | undefined) {
    return id ? this.orders.find((o) => o.id === id) : undefined;
  }

  warehouse(id: string) {
    return this.world.warehouses.find((w) => w.id === id)!;
  }

  warehouseLabel(id: string) {
    const w = this.warehouse(id);
    return `${w.id} ${w.name}`;
  }

  isActive(m: Mission) {
    return m.status === 'flying' || m.status === 'deviation' || m.status === 'lowBattery' || m.status === 'scheduled';
  }

  missionProgress(m: Mission) {
    const d = this.drone(m.droneId);
    if (m.status === 'delivered') return 1;
    if (!d || d.missionId !== m.id || !d.pathLen) return 0;
    return Math.min(1, d.travelled / d.pathLen);
  }

  /** Remaining distance in meters for an in-flight mission. */
  missionRemaining(m: Mission) {
    const d = this.drone(m.droneId);
    if (!d || d.missionId !== m.id) return 0;
    return Math.max(0, d.pathLen - d.travelled);
  }

  /** Sim seconds until arrival. */
  missionEta(m: Mission) {
    const d = this.drone(m.droneId);
    if (!d || d.missionId !== m.id) return 0;
    const v = Math.max(d.cruiseSpeed / 3.6, 1);
    return this.missionRemaining(m) / v + d.hold;
  }

  /** Called every animation frame with the sim-seconds step, for smooth renderers. */
  onFrame(listener: (dt: number) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ---- operator actions ----------------------------------------------------

  setRunning(value: boolean) {
    this.running.set(value);
  }

  setSpeed(value: number) {
    this.speed.set(value);
  }

  returnToBase(droneId: string) {
    const d = this.drone(droneId);
    if (!d || d.status === 'maintenance') return;
    const m = this.mission(d.missionId);
    if (m) this.releaseMission(m);
    this.sendHome(d);
    this.notify('returning', 'neutral', { drone: d.id });
    this.bump();
  }

  takeOffline(droneId: string) {
    const d = this.drone(droneId);
    if (!d) return;
    const m = this.mission(d.missionId);
    if (m) this.releaseMission(m);
    if (d.status === 'flying' || d.status === 'returning') {
      d.offlineOnLanding = true;
      this.sendHome(d);
    } else {
      d.status = 'maintenance';
      d.speed = 0;
    }
    this.notify('offline', 'danger', { drone: d.id });
    this.bump();
  }

  bringOnline(droneId: string) {
    const d = this.drone(droneId);
    if (!d || d.status !== 'maintenance') return;
    d.status = d.battery < 90 ? 'charging' : 'idle';
    d.offlineOnLanding = false;
    this.bump();
  }

  registerDrone(model: DroneModel, variant: DroneVariant, homeId: string) {
    const home = this.warehouse(homeId);
    const used = new Set(this.drones.filter((d) => d.homeId === homeId).map((d) => d.spot));
    let spot = 0;
    while (used.has(spot) && spot < home.spots.length - 1) spot++;
    const d = this.createDrone(this.randomId(model === 'Kestrel-V' ? 'SP' : 'AD'), model, variant, homeId, spot);
    d.battery = 100;
    d.status = 'idle';
    d.flightHours = 0;
    d.certDays = 365;
    this.drones.push(d);
    this.notify('registered', 'success', { drone: d.id });
    this.bump();
    return d.id;
  }

  reassignOrder(orderId: string, droneId: string) {
    const o = this.order(orderId);
    const d = this.drone(droneId);
    if (!o || !d || d.status !== 'idle') return false;
    const m = this.mission(o.missionId);
    if (m && m.droneId) {
      const prev = this.drone(m.droneId);
      if (prev) {
        prev.missionId = null;
        prev.payload = 0;
        prev.slotsUsed = 0;
        this.sendHome(prev);
      }
    }
    if (m) {
      m.status = 'cancelled';
      m.finishedAt = this.simTime;
    }
    o.status = 'scheduled';
    o.missionId = null;
    o.notBefore = this.simTime;
    this.dispatch(o, d);
    this.notify('reassigned', 'neutral', { order: o.id, drone: d.id });
    this.bump();
    return true;
  }

  rescheduleOrder(orderId: string, minutesFromNow: number) {
    const o = this.order(orderId);
    if (!o || o.status !== 'scheduled') return;
    o.notBefore = this.simTime + minutesFromNow * 60;
    o.requestedAt = o.notBefore;
    o.fixedTime = true;
    this.bump();
  }

  cancelOrder(orderId: string) {
    const o = this.order(orderId);
    if (!o || o.status === 'delivered' || o.status === 'cancelled') return;
    const m = this.mission(o.missionId);
    if (m) {
      const d = this.drone(m.droneId);
      m.status = 'cancelled';
      m.finishedAt = this.simTime;
      if (d) {
        d.missionId = null;
        this.sendHome(d);
      }
    }
    o.status = 'cancelled';
    this.notify('cancelled', 'danger', { order: o.id });
    this.bump();
  }

  placeOrder(input: { customer: string; pickupId: string; dropoff: Address; weight: number; priority: Order['priority'] }) {
    const o = this.createOrder(input.pickupId, this.simTime);
    o.customer = input.customer.trim() || o.customer;
    o.dropoff = input.dropoff;
    o.weight = Math.round(input.weight * 10) / 10;
    o.priority = input.priority;
    const m = this.mission(o.missionId);
    if (m) m.destination = input.dropoff;
    this.bump();
    return o.id;
  }

  markAllRead() {
    this.notifications.forEach((n) => (n.read = true));
    this.bump();
  }

  idleDrones() {
    return this.drones.filter((d) => d.status === 'idle');
  }

  // ---- setup ---------------------------------------------------------------

  private seed() {
    // pre-session delivery history, 06:00 → now, busier after 08:00
    let t = DAY_START + this.rng.range(200, 600);
    while (t < START_CLOCK - 120) {
      const busy = t > 8 * 3600 ? 1 : 0.45;
      this.deliveries.push({
        time: t,
        duration: this.rng.range(540, 1500),
        delay: this.rng.chance(0.86) ? this.rng.range(-150, 110) : this.rng.range(150, 720),
        hubId: this.rng.pick(this.world.warehouses).id,
        distance: this.rng.range(1500, 4200),
      });
      t += this.rng.range(180, 520) / busy;
    }

    const plan: { status: 'mission' | 'returning' | 'idle' | 'charging' }[] = [
      ...Array.from({ length: 14 }, () => ({ status: 'mission' as const })),
      ...Array.from({ length: 6 }, () => ({ status: 'returning' as const })),
      ...Array.from({ length: 8 }, () => ({ status: 'idle' as const })),
      ...Array.from({ length: 4 }, () => ({ status: 'charging' as const })),
    ];

    const spotsUsed = new Map<string, number>();
    plan.forEach((entry, index) => {
      const homeId = this.world.warehouses[index % 3].id;
      const spot = spotsUsed.get(homeId) ?? 0;
      spotsUsed.set(homeId, spot + 1);
      const id = FIXED_IDS[index] ?? this.randomId(this.rng.chance(0.3) ? 'SP' : 'AD');
      const isKestrel = index === 1 || (index > 4 && this.rng.chance(0.35));
      const model: DroneModel = isKestrel ? 'Kestrel-V' : 'Falcon-X2';
      const variant: DroneVariant = model === 'Kestrel-V' ? 'black' : this.rng.chance(0.55) ? 'black' : 'white';
      const d = this.createDrone(id, model, variant, homeId, spot);
      this.drones.push(d);

      if (entry.status === 'mission') {
        const order = this.createOrder(homeId, this.simTime - this.rng.range(300, 1500));
        this.dispatch(order, d, this.rng.range(0.12, 0.78));
        const m = this.mission(order.missionId)!;
        m.baseDelay = index === 0 ? 600 : index === 2 ? -60 : this.rng.pick([0, 0, 60, -60, 120, 300, 600]);
        if (index === 4) d.battery = 17;
        if (index === 3) m.baseDelay = 240;
      } else if (entry.status === 'returning') {
        const start = this.rng.pick(this.world.addresses).pos;
        d.pos = { ...start };
        d.status = 'returning';
        d.battery = this.rng.range(35, 70);
        this.routeTo(d, this.homeSpot(d));
        d.travelled = d.pathLen * this.rng.range(0.1, 0.6);
        this.placeOnPath(d);
        d.alt = d.cruiseAlt;
      } else if (entry.status === 'charging') {
        d.status = 'charging';
        d.battery = this.rng.range(22, 70);
      } else {
        d.status = 'idle';
        d.battery = this.rng.range(78, 100);
      }
    });

    for (let k = 0; k < TARGET_QUEUE; k++) {
      this.createOrder(this.rng.pick(this.world.warehouses).id, this.simTime + k * 240);
    }

    const [a, b] = [this.drones[3], this.drones[4]];
    this.pushNotification('delivered', 'success', { mission: 'MSN-4452', customer: 'CUST-093' }, START_CLOCK - 48 * 60);
    this.pushNotification('battery', 'danger', { drone: b.id, pad: this.warehouse(b.homeId).chargePad }, START_CLOCK - 38 * 60);
    this.pushNotification('deviation', 'danger', { drone: a.id, zone: 'Zone 4A' }, START_CLOCK - 18 * 60);
    this.notifications.forEach((n) => (n.read = true));
    this.notifications[0].read = false;
  }

  private createDrone(id: string, model: DroneModel, variant: DroneVariant, homeId: string, spot: number): DroneState {
    const home = this.warehouse(homeId);
    const pos = { ...home.spots[spot % home.spots.length] };
    const kestrel = model === 'Kestrel-V';
    return {
      id,
      model,
      variant,
      serial: `${kestrel ? 'KV' : 'FX2'}-${this.rng.int(10000, 99999)}`,
      thumb: `images/drones/${kestrel ? 'kestrel' : 'falcon'}-${variant}.png`,
      status: 'idle',
      offlineOnLanding: false,
      battery: 100,
      signal: 'good',
      payload: 0,
      payloadMax: kestrel ? 4.5 : 2.5,
      slots: 4,
      slotsUsed: 0,
      pos,
      alt: 0,
      cruiseAlt: this.rng.range(95, 130),
      heading: -Math.PI / 2,
      speed: 0,
      cruiseSpeed: this.rng.range(28, 42),
      pitch: 0,
      roll: 0,
      homeId,
      spot,
      missionId: null,
      path: null,
      pathLen: 0,
      travelled: 0,
      hold: 0,
      flightHours: this.rng.int(40, 420),
      certDays: this.rng.int(20, 340),
      maxAlt: kestrel ? 150 : 120,
      maxSpeed: kestrel ? 72 : 65,
      flightTime: kestrel ? 38 : 45,
      payloadRated: kestrel ? 4.5 : 2.5,
    };
  }

  private randomId(prefix: 'AD' | 'SP') {
    let id: string;
    do {
      id = `${prefix} ${String(this.rng.int(0, 9999)).padStart(4, '0')}-${String(this.rng.int(0, 9999)).padStart(4, '0')}`;
    } while (this.drones.some((d) => d.id === id));
    return id;
  }

  private createOrder(pickupId: string, requestedAt: number): Order {
    const pickup = this.warehouse(pickupId);
    let dropoff: Address;
    do {
      dropoff = this.rng.pick(this.world.addresses);
    } while (Math.hypot(dropoff.pos.x - pickup.pad.x, dropoff.pos.y - pickup.pad.y) < 700);

    const w = Math.round(this.rng.range(0.4, 2.3) * 10) / 10;
    const dims = this.rng.pick(['20×15×10', '30×20×12', '35×25×15', '25×25×20', '40×30×10']);
    const order: Order = {
      id: `ORD-${this.orderSeq++}`,
      customer: this.rng.pick(CUSTOMERS),
      customerId: `CUST-${String(this.customerSeq++).padStart(3, '0')}`,
      pickupId,
      dropoff,
      weight: w,
      dims,
      priority: this.rng.chance(0.4) ? 'express' : 'standard',
      requestedAt,
      notBefore: requestedAt,
      fixedTime: false,
      status: 'scheduled',
      missionId: null,
    };
    this.orders.push(order);

    const mission: Mission = {
      id: `MSN-${this.missionSeq++}`,
      orderId: order.id,
      droneId: null,
      status: 'scheduled',
      originId: pickupId,
      destination: dropoff,
      plannedSeconds: 0,
      startedAt: 0,
      baseDelay: 0,
      delay: 0,
      eta: 0,
      zoneId: null,
      finishedAt: null,
    };
    this.missions.push(mission);
    order.missionId = mission.id;
    return order;
  }

  private dispatch(order: Order, d: DroneState, progress = 0) {
    let m = this.mission(order.missionId);
    if (!m || m.status === 'cancelled') {
      m = {
        id: `MSN-${this.missionSeq++}`,
        orderId: order.id,
        droneId: null,
        status: 'scheduled',
        originId: order.pickupId,
        destination: order.dropoff,
        plannedSeconds: 0,
        startedAt: 0,
        baseDelay: 0,
        delay: 0,
        eta: 0,
        zoneId: null,
        finishedAt: null,
      };
      this.missions.push(m);
      order.missionId = m.id;
    }
    m.droneId = d.id;
    m.status = 'flying';
    m.startedAt = this.simTime;
    m.originId = d.homeId;
    order.pickupId = d.homeId;
    order.status = 'inFlight';

    d.missionId = m.id;
    d.status = 'flying';
    d.payload = order.weight;
    d.slotsUsed = Math.max(1, Math.min(d.slots, Math.ceil(order.weight / 0.7)));
    d.hold = 0;
    this.routeTo(d, order.dropoff.pos);
    m.plannedSeconds = d.pathLen / (d.cruiseSpeed / 3.6);
    if (progress > 0) {
      d.travelled = d.pathLen * progress;
      m.startedAt = this.simTime - m.plannedSeconds * progress;
      this.placeOnPath(d);
      d.alt = d.cruiseAlt;
      d.speed = d.cruiseSpeed;
      d.battery = Math.max(30, 100 - d.travelled * BATTERY_PER_METER - this.rng.range(0, 25));
    }
  }

  private releaseMission(m: Mission) {
    const o = this.order(m.orderId);
    const d = this.drone(m.droneId);
    if (d) {
      d.missionId = null;
      d.payload = 0;
      d.slotsUsed = 0;
    }
    m.status = 'cancelled';
    m.finishedAt = this.simTime;
    if (o && o.status === 'inFlight') {
      o.status = 'scheduled';
      o.missionId = null;
      o.notBefore = this.simTime + 60;
      const fresh = {
        ...m,
        id: `MSN-${this.missionSeq++}`,
        droneId: null,
        status: 'scheduled' as const,
        finishedAt: null,
      };
      this.missions.push(fresh);
      o.missionId = fresh.id;
    }
  }

  private homeSpot(d: DroneState) {
    const home = this.warehouse(d.homeId);
    return home.spots[d.spot % home.spots.length];
  }

  private sendHome(d: DroneState) {
    d.status = 'returning';
    d.missionId = null;
    d.payload = 0;
    d.slotsUsed = 0;
    d.hold = 0;
    this.routeTo(d, this.homeSpot(d));
  }

  private routeTo(d: DroneState, target: Vec2) {
    d.path = findRoute(this.world, d.pos, target, this.blocked);
    d.pathLen = pathLength(d.path);
    d.travelled = 0;
  }

  private placeOnPath(d: DroneState) {
    if (!d.path) return;
    const { p, heading } = pointAt(d.path, d.travelled);
    d.pos = p;
    d.heading = heading;
  }

  private rebuildBlocked() {
    this.blocked = new Set(this.zones.flatMap((z) => z.edges));
  }

  // ---- loop ----------------------------------------------------------------

  private loop(now: number) {
    this.frame = requestAnimationFrame((t) => this.loop(t));
    const realDt = this.lastFrame ? Math.min((now - this.lastFrame) / 1000, 0.1) : 0;
    this.lastFrame = now;
    const dt = this.running() ? realDt * this.speed() : 0;

    if (dt > 0) this.step(dt);
    for (const l of this.listeners) l(dt);

    if (now - this.lastUi > UI_INTERVAL_MS) {
      this.lastUi = now;
      this.bump();
    }
  }

  private bump() {
    this.tick.update((t) => t + 1);
  }

  private step(dt: number) {
    this.simTime += dt;

    for (const d of this.drones) this.stepDrone(d, dt);

    // dispatch scheduled orders to idle drones
    const inFlight = this.missions.filter(
      (m) => m.status === 'flying' || m.status === 'deviation' || m.status === 'lowBattery',
    ).length;
    if (inFlight < TARGET_IN_FLIGHT) {
      const byPriority = (a: Order, b: Order) =>
        a.priority === b.priority ? a.notBefore - b.notBefore : a.priority === 'express' ? -1 : 1;
      const scheduled = this.orders.filter((o) => o.status === 'scheduled');
      const due =
        scheduled.filter((o) => o.notBefore <= this.simTime).sort(byPriority)[0] ??
        scheduled.filter((o) => !o.fixedTime).sort(byPriority)[0];
      if (due) {
        const candidates = this.drones
          .filter((d) => (d.status === 'idle' && d.battery >= 50) || (d.status === 'charging' && d.battery >= 70))
          .sort((a, b) => (a.homeId === due.pickupId ? -1 : 0) - (b.homeId === due.pickupId ? -1 : 0));
        const d = candidates[0];
        if (d) {
          due.requestedAt = Math.min(due.requestedAt, this.simTime);
          this.dispatch(due, d);
        }
      }
    }
    const queued = this.orders.filter((o) => o.status === 'scheduled').length;
    if (queued < TARGET_QUEUE) {
      this.createOrder(this.rng.pick(this.world.warehouses).id, this.simTime + this.rng.range(60, 400));
    }

    // mission bookkeeping
    for (const m of this.missions) {
      if (m.status !== 'flying' && m.status !== 'deviation' && m.status !== 'lowBattery') continue;
      const d = this.drone(m.droneId);
      if (!d) continue;
      const elapsed = this.simTime - m.startedAt;
      m.eta = this.missionEta(m);
      m.delay = elapsed + m.eta - m.plannedSeconds + m.baseDelay;
      if (m.status === 'deviation' && d.hold <= 0 && m.zoneId && this.simTime - m.startedAt > 0) {
        // stay flagged as a deviation for a while after re-planning so operators notice it
        if (!this.zones.some((z) => z.id === m.zoneId)) m.status = d.battery < LOW_BATTERY ? 'lowBattery' : 'flying';
      }
    }

    // temporary no-fly zones → forced re-routing
    if (this.simTime >= this.nextDeviation) {
      this.nextDeviation = this.simTime + DEVIATION_EVERY * this.rng.range(0.8, 1.3);
      this.triggerDeviation();
    }
    const before = this.dynamicZones.length;
    this.dynamicZones = this.dynamicZones.filter((z) => {
      if (z.expires > this.simTime) return true;
      const idx = this.zones.indexOf(z.zone);
      if (idx >= 0) this.zones.splice(idx, 1);
      return false;
    });
    if (before !== this.dynamicZones.length) this.rebuildBlocked();

    // keep notification history bounded, and finished missions bounded
    if (this.notifications.length > 30) this.notifications.length = 30;
    const finished = this.missions.filter((m) => !this.isActive(m));
    if (finished.length > 60) {
      const drop = new Set(finished.slice(0, finished.length - 60));
      for (let k = this.missions.length - 1; k >= 0; k--) if (drop.has(this.missions[k])) this.missions.splice(k, 1);
    }
  }

  private stepDrone(d: DroneState, dt: number) {
    const home = this.warehouse(d.homeId);
    const nearest = Math.min(
      ...this.world.warehouses.map((w) => Math.hypot(w.pad.x - d.pos.x, w.pad.y - d.pos.y)),
    );
    d.signal = nearest < 900 ? 'good' : nearest < 1500 ? 'fair' : 'weak';

    if (d.status === 'charging') {
      d.battery = Math.min(100, d.battery + CHARGE_PER_SECOND * dt);
      if (d.battery >= 100) d.status = 'idle';
      return;
    }
    if (d.status === 'idle' || d.status === 'maintenance') {
      d.speed = 0;
      d.alt = Math.max(0, d.alt - 20 * dt);
      return;
    }
    if (!d.path) return;

    const prevHeading = d.heading;
    if (d.hold > 0) {
      d.hold -= dt;
      d.speed = Math.max(0, d.speed - 20 * dt);
      if (d.hold <= 0) {
        const m = this.mission(d.missionId);
        this.routeTo(d, m ? m.destination.pos : this.homeSpot(d));
      }
    } else {
      const target = d.cruiseSpeed * (d.payload > 0 ? 0.95 : 1);
      d.speed += (target - d.speed) * Math.min(1, dt * 0.8);
      const v = d.speed / 3.6;
      d.travelled = Math.min(d.pathLen, d.travelled + v * dt);
      d.battery = Math.max(0, d.battery - v * dt * BATTERY_PER_METER);
      d.flightHours += dt / 3600;
      this.placeOnPath(d);
    }

    // altitude profile: climb out, cruise, descend
    const remaining = d.pathLen - d.travelled;
    const ramp = Math.min(1, d.travelled / 90, remaining / 90);
    d.alt += (d.cruiseAlt * Math.max(0.05, ramp) - d.alt) * Math.min(1, dt * 1.5);

    let dh = d.heading - prevHeading;
    if (dh > Math.PI) dh -= Math.PI * 2;
    if (dh < -Math.PI) dh += Math.PI * 2;
    d.roll += (Math.max(-18, Math.min(18, (dh / Math.max(dt, 0.001)) * 6)) - d.roll) * Math.min(1, dt * 2);
    d.pitch += ((d.speed / Math.max(d.cruiseSpeed, 1)) * 6 - d.pitch) * Math.min(1, dt * 2);

    const m = this.mission(d.missionId);
    if (m && d.battery < LOW_BATTERY && m.status === 'flying') {
      m.status = 'lowBattery';
      this.notify('battery', 'danger', { drone: d.id, pad: home.chargePad });
    }

    if (d.travelled >= d.pathLen - 0.5) {
      if (d.status === 'flying' && m) {
        m.status = 'delivered';
        m.finishedAt = this.simTime;
        const o = this.order(m.orderId);
        if (o) o.status = 'delivered';
        this.deliveries.push({
          time: this.simTime,
          duration: this.simTime - m.startedAt,
          delay: m.delay,
          hubId: m.originId,
          distance: d.pathLen,
        });
        if (o?.priority === 'express') {
          this.notify('delivered', 'success', { mission: m.id, customer: o.customerId });
        }
        this.sendHome(d);
      } else if (d.status === 'returning') {
        d.path = null;
        d.pathLen = 0;
        d.travelled = 0;
        d.speed = 0;
        d.alt = 0;
        d.pos = { ...this.homeSpot(d) };
        if (d.offlineOnLanding) {
          d.status = 'maintenance';
          d.offlineOnLanding = false;
        } else {
          d.status = d.battery < 55 ? 'charging' : 'idle';
        }
      } else if (d.status === 'flying' && !m) {
        this.sendHome(d);
      }
    }
  }

  private triggerDeviation() {
    const flying = this.drones.filter((d) => {
      const m = this.mission(d.missionId);
      return d.status === 'flying' && m && m.status === 'flying' && d.path && d.pathLen - d.travelled > 700;
    });
    if (!flying.length || this.dynamicZones.length >= 2) return;
    const d = this.rng.pick(flying);
    const edge = this.edgeAhead(d, 260);
    if (!edge) return;

    const letters = 'ABCDEFGH';
    const zone = this.zoneForEdge(`Zone ${6 + (this.zoneSeq % 4)}${letters[this.zoneSeq % letters.length]}`, edge);
    this.zoneSeq++;
    this.zones.push(zone);
    this.dynamicZones.push({ zone, expires: this.simTime + ZONE_LIFETIME });
    this.rebuildBlocked();

    for (const other of this.drones) {
      if (!other.path || (other.status !== 'flying' && other.status !== 'returning')) continue;
      if (!this.pathCrosses(other, zone)) continue;
      const m = this.mission(other.missionId);
      other.hold = other === d ? REPLAN_HOLD : 2;
      if (m) {
        m.status = 'deviation';
        m.zoneId = zone.id;
      }
    }
    this.notify('deviation', 'danger', { drone: d.id, zone: zone.id });
  }

  private edgeAhead(d: DroneState, minAhead: number) {
    const { xs, ys } = this.world;
    const path = d.path!;
    let acc = 0;
    for (let k = 1; k < path.length; k++) {
      const a = path[k - 1];
      const b = path[k];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const segStart = acc;
      acc += len;
      if (segStart < d.travelled + minAhead) continue;
      const ia = xs.indexOf(a.x);
      const ja = ys.indexOf(a.y);
      const ib = xs.indexOf(b.x);
      const jb = ys.indexOf(b.y);
      if (ia < 0 || ja < 0 || ib < 0 || jb < 0) continue;
      if (ia === ib && Math.abs(jb - ja) >= 1) {
        const j = Math.min(ja, jb) + Math.floor(Math.abs(jb - ja) / 2);
        return { axis: 'x' as const, i: ia, j };
      }
      if (ja === jb && Math.abs(ib - ia) >= 1) {
        const i = Math.min(ia, ib) + Math.floor(Math.abs(ib - ia) / 2);
        return { axis: 'y' as const, i, j: ja };
      }
    }
    return null;
  }

  private zoneForEdge(id: string, e: { axis: 'x' | 'y'; i: number; j: number }): NoFlyZone {
    const { xs, ys } = this.world;
    if (e.axis === 'y') {
      const x0 = xs[e.i];
      const x1 = xs[e.i + 1];
      const y = ys[e.j];
      const rect = { x: x0 + 30, y: y - 22, w: x1 - x0 - 60, h: 44 };
      return { id, rect, center: { x: (x0 + x1) / 2, y }, edges: [edgeKey(e.i, e.j, e.i + 1, e.j)], temporary: true };
    }
    const x = xs[e.i];
    const y0 = ys[e.j];
    const y1 = ys[e.j + 1];
    const rect = { x: x - 22, y: y0 + 30, w: 44, h: y1 - y0 - 60 };
    return { id, rect, center: { x, y: (y0 + y1) / 2 }, edges: [edgeKey(e.i, e.j, e.i, e.j + 1)], temporary: true };
  }

  private pathCrosses(d: DroneState, zone: NoFlyZone) {
    const path = d.path!;
    const r = zone.rect;
    let acc = 0;
    for (let k = 1; k < path.length; k++) {
      const a = path[k - 1];
      const b = path[k];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      acc += len;
      if (acc < d.travelled) continue;
      const minX = Math.min(a.x, b.x);
      const maxX = Math.max(a.x, b.x);
      const minY = Math.min(a.y, b.y);
      const maxY = Math.max(a.y, b.y);
      if (maxX >= r.x && minX <= r.x + r.w && maxY >= r.y && minY <= r.y + r.h) return true;
    }
    return false;
  }

  private notify(kind: NotificationKind, tone: SimNotification['tone'], params: Record<string, string>) {
    this.pushNotification(kind, tone, params, this.simTime);
  }

  private pushNotification(
    kind: NotificationKind,
    tone: SimNotification['tone'],
    params: Record<string, string>,
    time: number,
  ) {
    // routine successes are logged but don't light up the bell badge
    this.notifications.unshift({ id: this.notificationSeq++, kind, tone, params, time, read: tone === 'success' });
  }
}
