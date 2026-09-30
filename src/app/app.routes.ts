import { Routes, UrlMatchResult, UrlSegment } from '@angular/router';

/** Matches `prefix` and `prefix/:id` with one route so the page component survives selection changes. */
function withOptionalId(prefix: string) {
  return (segments: UrlSegment[]): UrlMatchResult | null => {
    if (!segments.length || segments[0].path !== prefix || segments.length > 2) return null;
    return {
      consumed: segments,
      posParams: segments[1] ? { id: segments[1] } : {},
    };
  };
}

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    data: { page: 'overview' },
    loadComponent: () => import('./pages/overview/overview.page').then((m) => m.OverviewPage),
  },
  {
    matcher: withOptionalId('missions'),
    data: { page: 'missions' },
    loadComponent: () => import('./pages/missions/missions.page').then((m) => m.MissionsPage),
  },
  {
    matcher: withOptionalId('orders'),
    data: { page: 'orders' },
    loadComponent: () => import('./pages/orders/orders.page').then((m) => m.OrdersPage),
  },
  {
    matcher: withOptionalId('fleet'),
    data: { page: 'fleet' },
    loadComponent: () => import('./pages/fleet/fleet.page').then((m) => m.FleetPage),
  },
  {
    path: 'analytics',
    data: { page: 'analytics' },
    loadComponent: () => import('./pages/analytics/analytics.page').then((m) => m.AnalyticsPage),
  },
  {
    path: 'company',
    data: { page: 'company' },
    loadComponent: () => import('./pages/company/company.page').then((m) => m.CompanyPage),
  },
  {
    path: 'settings',
    data: { page: 'settings' },
    loadComponent: () => import('./pages/settings/settings.page').then((m) => m.SettingsPage),
  },
  { path: '**', redirectTo: '' },
];
