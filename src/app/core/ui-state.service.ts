import { Injectable, signal } from '@angular/core';

export type OverviewLayer = 'aerial' | 'routes' | 'weather' | 'drones' | 'zones';

@Injectable({ providedIn: 'root' })
export class UiStateService {
  readonly search = signal('');
  readonly selectedMissionId = signal<string | null>(null);
  readonly selectedDroneId = signal<string | null>(null);
  readonly selectedOrderId = signal<string | null>(null);
  readonly missionView = signal<'map' | '3d'>('map');
  readonly layers = signal<Record<OverviewLayer, boolean>>({
    aerial: true,
    routes: true,
    weather: false,
    drones: true,
    zones: true,
  });

  toggleLayer(layer: OverviewLayer) {
    this.layers.update((l) => ({ ...l, [layer]: !l[layer] }));
  }

  setAllLayers(value: boolean) {
    this.layers.set({ aerial: value, routes: value, weather: value, drones: value, zones: value });
  }
}
