import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { App } from './app';
import { FleetSimService } from './core/sim/fleet-sim.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the dashboard navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.side__item').length).toBe(7);
    expect(compiled.querySelector('.search input')).toBeTruthy();
  });
});

describe('FleetSimService', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] }));

  it('seeds a fleet with drones in flight on valid routes', () => {
    const sim = TestBed.inject(FleetSimService);
    expect(sim.drones.length).toBe(32);
    const flying = sim.drones.filter((d) => d.status === 'flying');
    expect(flying.length).toBeGreaterThan(10);
    for (const d of flying) {
      expect(d.path?.length).toBeGreaterThan(1);
      expect(Number.isFinite(d.pos.x) && Number.isFinite(d.pos.y)).toBeTrue();
      expect(sim.mission(d.missionId)?.droneId).toBe(d.id);
    }
  });

  it('reassigns a queued order to an idle drone', () => {
    const sim = TestBed.inject(FleetSimService);
    const order = sim.orders.find((o) => o.status === 'scheduled')!;
    const idle = sim.idleDrones()[0];
    expect(sim.reassignOrder(order.id, idle.id)).toBeTrue();
    expect(order.status).toBe('inFlight');
    expect(sim.mission(order.missionId)?.droneId).toBe(idle.id);
  });
});
