import { Address, Vec2 } from './world';

export type DroneModel = 'Falcon-X2' | 'Kestrel-V';
export type DroneVariant = 'white' | 'black';
export type DroneStatus = 'flying' | 'returning' | 'idle' | 'charging' | 'maintenance';
export type SignalQuality = 'good' | 'fair' | 'weak';

export interface DroneState {
  id: string;
  model: DroneModel;
  variant: DroneVariant;
  serial: string;
  thumb: string;
  status: DroneStatus;
  /** Set when the operator asked the drone to go offline once it lands. */
  offlineOnLanding: boolean;
  battery: number;
  signal: SignalQuality;
  payload: number;
  payloadMax: number;
  slots: number;
  slotsUsed: number;
  pos: Vec2;
  alt: number;
  cruiseAlt: number;
  heading: number;
  speed: number;
  cruiseSpeed: number;
  pitch: number;
  roll: number;
  homeId: string;
  spot: number;
  missionId: string | null;
  path: Vec2[] | null;
  pathLen: number;
  travelled: number;
  /** Sim seconds left hovering in place while a new route is planned. */
  hold: number;
  flightHours: number;
  certDays: number;
  maxAlt: number;
  maxSpeed: number;
  flightTime: number;
  payloadRated: number;
}

export type MissionStatus = 'flying' | 'deviation' | 'lowBattery' | 'delivered' | 'scheduled' | 'cancelled';

export interface Mission {
  id: string;
  orderId: string;
  droneId: string | null;
  status: MissionStatus;
  originId: string;
  destination: Address;
  plannedSeconds: number;
  startedAt: number;
  baseDelay: number;
  delay: number;
  eta: number;
  zoneId: string | null;
  finishedAt: number | null;
}

export type OrderStatus = 'inFlight' | 'scheduled' | 'delivered' | 'cancelled';
export type Priority = 'express' | 'standard';

export interface Order {
  id: string;
  customer: string;
  customerId: string;
  pickupId: string;
  dropoff: Address;
  weight: number;
  dims: string;
  priority: Priority;
  requestedAt: number;
  notBefore: number;
  /** Operator picked an explicit slot, so the dispatcher must not pull it forward. */
  fixedTime: boolean;
  status: OrderStatus;
  missionId: string | null;
}

export type NotificationKind =
  | 'deviation'
  | 'battery'
  | 'delivered'
  | 'offline'
  | 'returning'
  | 'reassigned'
  | 'cancelled'
  | 'registered';

export interface SimNotification {
  id: number;
  kind: NotificationKind;
  tone: 'success' | 'danger' | 'neutral';
  params: Record<string, string>;
  time: number;
  read: boolean;
}

export interface FleetCounts {
  all: number;
  flying: number;
  idle: number;
  charging: number;
  maintenance: number;
}

export interface Delivery {
  time: number;
  duration: number;
  delay: number;
  hubId: string;
  distance: number;
}
