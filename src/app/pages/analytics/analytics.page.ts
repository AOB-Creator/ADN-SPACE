import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';
import { FleetSimService } from '../../core/sim/fleet-sim.service';
import { IconComponent } from '../../shared/icon.component';

const W = 600;
const H = 220;
const M = { l: 34, r: 8, t: 12, b: 26 };

function niceMax(v: number) {
  if (v <= 5) return 5;
  const step = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / step) * step;
}

@Component({
  selector: 'app-analytics-page',
  standalone: true,
  imports: [IconComponent, RouterLink],
  templateUrl: './analytics.page.html',
  styleUrl: './analytics.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsPage {
  protected readonly i18n = inject(I18nService);
  protected readonly sim = inject(FleetSimService);
  protected readonly W = W;
  protected readonly H = H;
  protected readonly M = M;

  private readonly hourly = computed(() => {
    this.sim.tick();
    const now = this.sim.simTime;
    const first = 6;
    const last = Math.floor(now / 3600);
    const rows: { hour: number; onTime: number; late: number }[] = [];
    for (let h = first; h <= last; h++) rows.push({ hour: h, onTime: 0, late: 0 });
    for (const d of this.sim.deliveries) {
      const row = rows[Math.floor(d.time / 3600) - first];
      if (!row) continue;
      if (d.delay <= 120) row.onTime++;
      else row.late++;
    }
    return rows;
  });

  protected readonly summary = computed(() => {
    this.sim.tick();
    const k = this.sim.kpis();
    const c = this.sim.counts();
    const dist = this.sim.deliveries.reduce((s, d) => s + d.distance, 0) / Math.max(1, this.sim.deliveries.length);
    return {
      delivered: k.deliveredToday,
      onTime: k.onTimeRate,
      avg: k.avgDelivery,
      utilization: c.flying / Math.max(1, c.all),
      distance: dist / 1000,
    };
  });

  protected readonly bars = computed(() => {
    const rows = this.hourly();
    const max = niceMax(Math.max(...rows.map((r) => r.onTime + r.late), 1));
    const iw = W - M.l - M.r;
    const ih = H - M.t - M.b;
    const slot = iw / rows.length;
    const bw = Math.min(34, slot * 0.62);
    const y = (v: number) => M.t + ih - (v / max) * ih;
    return {
      ticks: [0, max / 2, max].map((v) => ({ v, y: y(v) })),
      items: rows.map((r, i) => {
        const x = M.l + slot * i + (slot - bw) / 2;
        return {
          x,
          w: bw,
          cx: x + bw / 2,
          label: String(r.hour).padStart(2, '0'),
          onTime: { y: y(r.onTime), h: M.t + ih - y(r.onTime) },
          late: { y: y(r.onTime + r.late), h: y(r.onTime) - y(r.onTime + r.late) },
          total: r.onTime + r.late,
          current: i === rows.length - 1,
        };
      }),
    };
  });

  protected readonly trend = computed(() => {
    const rows = this.hourly();
    const iw = W - M.l - M.r;
    const ih = H - M.t - M.b;
    const lo = 0.5;
    let acc = 0;
    let n = 0;
    const pts = rows.map((r, i) => {
      acc += r.onTime;
      n += r.onTime + r.late;
      const rate = n ? acc / n : 1;
      return {
        x: M.l + (rows.length === 1 ? iw / 2 : (iw / (rows.length - 1)) * i),
        y: M.t + ih - ((Math.max(lo, rate) - lo) / (1 - lo)) * ih,
        rate,
        label: String(r.hour).padStart(2, '0'),
      };
    });
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('');
    const area = `${line}L${pts[pts.length - 1].x.toFixed(1)} ${M.t + ih}L${pts[0].x.toFixed(1)} ${M.t + ih}Z`;
    const ticks = [0.5, 0.75, 1].map((v) => ({ v, y: M.t + ih - ((v - lo) / (1 - lo)) * ih }));
    return { line, area, pts, ticks, last: pts[pts.length - 1] };
  });

  protected readonly donut = computed(() => {
    const c = this.sim.counts();
    const r = 54;
    const circ = 2 * Math.PI * r;
    const parts = [
      { key: 'flying' as const, v: c.flying, cls: 'accent' },
      { key: 'idle' as const, v: c.idle, cls: 'warning' },
      { key: 'charging' as const, v: c.charging, cls: 'success' },
      { key: 'maintenance' as const, v: c.maintenance, cls: 'danger' },
    ];
    let offset = 0;
    const gap = 2;
    return {
      r,
      total: c.all,
      parts: parts.map((p) => {
        const len = (p.v / Math.max(1, c.all)) * circ;
        const seg = { ...p, dash: `${Math.max(0, len - gap)} ${circ}`, offset: -offset };
        offset += len;
        return seg;
      }),
    };
  });

  protected readonly batteries = computed(() => {
    this.sim.tick();
    return [...this.sim.drones]
      .sort((a, b) => b.battery - a.battery)
      .map((d) => ({ id: d.id, v: d.battery, level: d.battery < 20 ? 'low' : d.battery < 50 ? 'mid' : 'ok' }));
  });

  protected readonly hubs = computed(() => {
    this.sim.tick();
    const rows = this.sim.world.warehouses.map((w) => ({
      id: w.id,
      name: w.name,
      done: this.sim.deliveries.filter((d) => d.hubId === w.id).length,
      live: this.sim.activeOperations().filter((m) => m.originId === w.id && m.status !== 'scheduled').length,
    }));
    const max = Math.max(...rows.map((r) => r.done + r.live), 1);
    return rows.map((r) => ({ ...r, donePct: (r.done / max) * 100, livePct: (r.live / max) * 100 }));
  });
}
