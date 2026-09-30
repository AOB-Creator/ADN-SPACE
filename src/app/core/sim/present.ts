import type { Tone } from '../../shared/ui/status-dot.component';
import type { DroneStatus, Mission, OrderStatus } from './models';

export const missionTone = (m: Mission): Tone =>
  m.status === 'deviation'
    ? 'danger'
    : m.status === 'lowBattery'
      ? 'warning'
      : m.status === 'flying'
        ? 'success'
        : m.status === 'delivered'
          ? 'accent'
          : 'muted';

export const droneTone = (s: DroneStatus): Tone =>
  s === 'flying' || s === 'returning'
    ? 'accent'
    : s === 'idle'
      ? 'warning'
      : s === 'charging'
        ? 'success'
        : 'danger';

export const orderTone = (s: OrderStatus): Tone =>
  s === 'inFlight' ? 'accent' : s === 'scheduled' ? 'warning' : s === 'delivered' ? 'success' : 'danger';

/** Left-hand note under the origin: punctuality at a glance. */
export function originNote(m: Mission): { key: 'onTime' | 'delayed' | 'rerouting' | 'waiting'; tone: Tone } {
  if (m.status === 'scheduled') return { key: 'waiting', tone: 'muted' };
  if (m.status === 'deviation') return { key: 'rerouting', tone: 'danger' };
  if (m.delay > 90) return { key: 'delayed', tone: 'muted' };
  return { key: 'onTime', tone: 'muted' };
}

/** Right-hand note under the destination: schedule delta, or the deviation flag. */
export function destinationTone(m: Mission): Tone {
  if (m.status === 'deviation') return 'danger';
  return m.delay > 30 ? 'danger' : m.delay < -30 ? 'success' : 'muted';
}
