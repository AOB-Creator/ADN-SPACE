import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { IconComponent, IconName } from '../shared/icon.component';
import { I18nService } from '../i18n/i18n.service';
import { LOCALES, Locale } from '../i18n/translations';
import { ThemeService } from '../shared/theme.service';
import { FleetSimService } from '../core/sim/fleet-sim.service';
import { UiStateService } from '../core/ui-state.service';
import { ShellService } from './shell.service';
import { AppStrings } from '../i18n/app-strings';
import { SimNotification } from '../core/sim/models';

type NavKey = keyof AppStrings['nav'];

interface NavItem {
  key: NavKey;
  icon: IconName;
  path: string;
  badge?: boolean;
}

interface Suggestion {
  group: 'drones' | 'missions' | 'orders' | 'addresses';
  label: string;
  meta: string;
  link: string[];
  query?: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly theme = inject(ThemeService);
  protected readonly sim = inject(FleetSimService);
  protected readonly ui = inject(UiStateService);
  protected readonly shell = inject(ShellService);
  private readonly router = inject(Router);

  protected readonly locales = LOCALES;
  protected readonly menu = signal<'notifications' | 'user' | 'search' | 'more' | null>(null);

  protected readonly nav: NavItem[] = [
    { key: 'overview', icon: 'grid', path: '/' },
    { key: 'missions', icon: 'route', path: '/missions' },
    { key: 'orders', icon: 'list', path: '/orders', badge: true },
    { key: 'fleet', icon: 'drone', path: '/fleet' },
    { key: 'analytics', icon: 'chart', path: '/analytics' },
    { key: 'company', icon: 'building', path: '/company' },
    { key: 'settings', icon: 'settings', path: '/settings' },
  ];

  protected readonly tabs: NavItem[] = [
    { key: 'overview', icon: 'grid', path: '/' },
    { key: 'map', icon: 'map', path: '/missions/live' },
    { key: 'missions', icon: 'route', path: '/missions' },
    { key: 'orders', icon: 'list', path: '/orders', badge: true },
  ];

  private readonly routeData = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => {
        let r = this.router.routerState.snapshot.root;
        while (r.firstChild) r = r.firstChild;
        return r.data as { page?: NavKey };
      }),
    ),
    { initialValue: {} as { page?: NavKey } },
  );

  protected readonly page = computed(() => this.routeData().page ?? 'overview');
  protected readonly title = computed(() => this.shell.titleOverride() ?? this.i18n.a().nav[this.page()]);

  protected readonly pendingOrders = computed(() => {
    this.sim.tick();
    return this.sim.orders.some((o) => o.status === 'scheduled');
  });

  protected readonly notifications = computed(() => {
    this.sim.tick();
    return this.sim.notifications.slice(0, 12);
  });

  protected readonly suggestions = computed<Suggestion[]>(() => {
    const q = this.ui.search().trim().toLowerCase();
    if (q.length < 2) return [];
    this.sim.tick();
    const t = this.i18n.a();
    const out: Suggestion[] = [];
    for (const d of this.sim.drones) {
      if (d.id.toLowerCase().includes(q) || d.model.toLowerCase().includes(q))
        out.push({ group: 'drones', label: d.id, meta: `${d.model} · ${t.droneStatus[d.status]}`, link: ['/fleet', d.id] });
    }
    for (const m of this.sim.missions) {
      if (!this.sim.isActive(m)) continue;
      if (m.id.toLowerCase().includes(q) || m.destination.label.toLowerCase().includes(q))
        out.push({ group: 'missions', label: m.id, meta: m.destination.label, link: ['/missions', m.id] });
    }
    for (const o of this.sim.orders) {
      if (o.id.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q))
        out.push({ group: 'orders', label: o.id, meta: o.customer, link: ['/orders', o.id] });
    }
    for (const a of this.sim.world.addresses) {
      if (a.label.toLowerCase().includes(q))
        out.push({ group: 'addresses', label: a.label, meta: 'Nukus', link: ['/missions'], query: a.label });
    }
    return out.slice(0, 8);
  });

  protected navLabel(key: NavKey) {
    return this.i18n.a().nav[key];
  }

  protected toggle(menu: 'notifications' | 'user' | 'search' | 'more') {
    this.menu.update((m) => (m === menu ? null : menu));
  }

  protected onSearch(value: string) {
    this.ui.search.set(value);
    this.menu.set(value.trim().length >= 2 ? 'search' : null);
  }

  protected go(s: Suggestion) {
    this.menu.set(null);
    this.ui.search.set(s.query ?? '');
    this.router.navigate(s.link);
  }

  protected submitSearch() {
    const first = this.suggestions()[0];
    if (first) this.go(first);
  }

  protected notificationText(n: SimNotification) {
    const tpl = this.i18n.a().notifications.kinds[n.kind];
    return { title: this.i18n.f(tpl.title, n.params), body: this.i18n.f(tpl.body, n.params) };
  }

  protected notificationIcon(n: SimNotification): IconName {
    return n.tone === 'success' ? 'check-circle' : n.tone === 'danger' ? 'alert-circle' : 'check-circle';
  }

  protected setLocale(code: Locale) {
    this.i18n.setLocale(code);
  }

  protected toggleLive() {
    this.sim.setRunning(!this.sim.running());
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.menu()) return;
    const target = event.target as HTMLElement;
    if (!target.closest('[data-menu-root]')) this.menu.set(null);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.menu.set(null);
  }

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => this.menu.set(null));
  }
}
