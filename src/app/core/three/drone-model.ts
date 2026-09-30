import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { DroneModel, DroneVariant } from '../sim/models';

export interface DroneRig {
  group: THREE.Group;
  /** Rotor groups — spin these around their local Y axis. */
  props: THREE.Object3D[];
  /** Blurred rotor discs, faded in while spinning fast. */
  discs: THREE.Mesh[];
}

interface Palette {
  shell: number;
  trim: number;
  motor: number;
  prop: number;
  lens: number;
}

const PALETTES: Record<DroneVariant, Palette> = {
  white: { shell: 0xe9ebee, trim: 0x868c95, motor: 0x5d626a, prop: 0xc9ccd1, lens: 0x0b0c0e },
  black: { shell: 0x1e2023, trim: 0x3a3d42, motor: 0x2b2e33, prop: 0x2a2c30, lens: 0x07080a },
};

function mat(color: number, roughness = 0.45, metalness = 0.1) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function cylinderBetween(a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, dir.length(), 10), material);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
}

function rotor(radius: number, bladeWidth: number, palette: Palette, spin: 1 | -1) {
  const hub = new THREE.Group();
  const bladeMat = mat(palette.prop, 0.5, 0.05);
  for (let k = 0; k < 2; k++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(radius, 0.004, bladeWidth), bladeMat);
    blade.position.x = (radius / 2) * (k === 0 ? 1 : -1);
    blade.rotation.x = 0.18 * spin * (k === 0 ? 1 : -1);
    hub.add(blade);
  }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.014, 12), mat(palette.trim, 0.35, 0.4));
  hub.add(cap);
  return hub;
}

function disc(radius: number) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 32),
    new THREE.MeshBasicMaterial({ color: 0x9aa0a8, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
  );
  m.rotation.x = -Math.PI / 2;
  return m;
}

function led(color: number) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(0.009, 8, 8),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.2 }),
  );
}

/** Phantom-style consumer/survey quad: rounded shell, integrated arms, skid landing gear, 3-axis gimbal. */
function buildFalcon(p: Palette, rig: DroneRig) {
  const g = rig.group;
  const shellMat = new THREE.MeshPhysicalMaterial({
    color: p.shell,
    roughness: 0.32,
    metalness: 0.05,
    clearcoat: 0.8,
    clearcoatRoughness: 0.25,
  });

  const body = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.085, 0.26, 5, 0.04), shellMat);
  body.position.y = 0.16;
  g.add(body);

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), shellMat);
  canopy.scale.set(0.95, 0.42, 1.15);
  canopy.position.set(0, 0.2, 0);
  g.add(canopy);

  const stripe = new THREE.Mesh(new RoundedBoxGeometry(0.205, 0.012, 0.265, 3, 0.005), mat(p.trim, 0.4, 0.3));
  stripe.position.y = 0.14;
  g.add(stripe);

  const armLen = 0.26;
  const corners = [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ];
  corners.forEach(([sx, sz], k) => {
    const end = new THREE.Vector3(sx * armLen * 0.7071, 0.175, sz * armLen * 0.7071);
    const arm = cylinderBetween(new THREE.Vector3(0, 0.16, 0), end, 0.018, shellMat);
    arm.scale.set(1.25, 1, 0.8);
    g.add(arm);

    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.05, 16), mat(p.motor, 0.35, 0.5));
    motor.position.copy(end).add(new THREE.Vector3(0, 0.012, 0));
    g.add(motor);

    const light = led(sz > 0 ? 0xff3b30 : 0x34c759);
    light.position.copy(end).add(new THREE.Vector3(0, -0.018, 0));
    g.add(light);

    const r = rotor(0.14, 0.024, p, k % 3 === 0 ? 1 : -1);
    r.position.copy(end).add(new THREE.Vector3(0, 0.045, 0));
    g.add(r);
    rig.props.push(r);
    const d = disc(0.15);
    d.position.copy(r.position);
    g.add(d);
    rig.discs.push(d);
  });

  // skid landing gear
  const gearMat = mat(p.shell === 0xe9ebee ? 0xd6d9dd : 0x2a2c30, 0.4, 0.1);
  for (const sx of [-1, 1]) {
    const topF = new THREE.Vector3(sx * 0.06, 0.13, 0.07);
    const topB = new THREE.Vector3(sx * 0.06, 0.13, -0.07);
    const footF = new THREE.Vector3(sx * 0.12, 0.004, 0.08);
    const footB = new THREE.Vector3(sx * 0.12, 0.004, -0.08);
    g.add(cylinderBetween(topF, footF, 0.007, gearMat));
    g.add(cylinderBetween(topB, footB, 0.007, gearMat));
    g.add(cylinderBetween(footF.clone().add(new THREE.Vector3(0, 0, 0.05)), footB.clone().add(new THREE.Vector3(0, 0, -0.05)), 0.008, gearMat));
  }

  addGimbal(g, p, new THREE.Vector3(0, 0.085, 0.05), 0.045);
}

/** Open X-frame heavy-lift quad: carbon arms, stacked plates, battery, GPS mast, tall legs. */
function buildKestrel(p: Palette, rig: DroneRig) {
  const g = rig.group;
  const carbon = mat(p.shell, 0.55, 0.25);
  const trim = mat(p.trim, 0.45, 0.35);

  const plateTop = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.014, 0.24, 3, 0.006), carbon);
  plateTop.position.y = 0.24;
  const plateBottom = plateTop.clone();
  plateBottom.position.y = 0.2;
  g.add(plateTop, plateBottom);

  const shell = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.05, 0.2, 4, 0.02), carbon);
  shell.position.y = 0.272;
  g.add(shell);

  const battery = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.04, 0.16, 3, 0.012), trim);
  battery.position.y = 0.314;
  g.add(battery);
  const label = new THREE.Mesh(new THREE.BoxGeometry(0.101, 0.012, 0.06), mat(0x6b7078, 0.4, 0.2));
  label.position.set(0, 0.318, 0.02);
  g.add(label);

  const mast = cylinderBetween(new THREE.Vector3(0, 0.33, -0.07), new THREE.Vector3(0, 0.39, -0.07), 0.005, trim);
  const gps = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 20), carbon);
  gps.position.set(0, 0.395, -0.07);
  g.add(mast, gps);

  const armLen = 0.34;
  [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ].forEach(([sx, sz], k) => {
    const end = new THREE.Vector3(sx * armLen * 0.7071, 0.22, sz * armLen * 0.7071);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.018, armLen), carbon);
    arm.position.set(end.x / 2, 0.22, end.z / 2);
    arm.rotation.y = Math.atan2(sx, sz);
    g.add(arm);

    const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.012, 16), trim);
    mount.position.copy(end).add(new THREE.Vector3(0, 0.012, 0));
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.045, 18), mat(p.motor, 0.3, 0.6));
    motor.position.copy(end).add(new THREE.Vector3(0, 0.04, 0));
    g.add(mount, motor);

    const light = led(0xff3b30);
    light.position.copy(end).add(new THREE.Vector3(0, -0.016, 0));
    g.add(light);

    const r = rotor(0.2, 0.03, p, k % 3 === 0 ? 1 : -1);
    r.position.copy(end).add(new THREE.Vector3(0, 0.07, 0));
    g.add(r);
    rig.props.push(r);
    const d = disc(0.21);
    d.position.copy(r.position);
    g.add(d);
    rig.discs.push(d);
  });

  // tall landing legs
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const top = new THREE.Vector3(sx * 0.07, 0.2, sz * 0.08);
      const foot = new THREE.Vector3(sx * 0.12, 0.006, sz * 0.13);
      g.add(cylinderBetween(top, foot, 0.008, carbon));
      const pad = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), trim);
      pad.position.copy(foot);
      g.add(pad);
    }
  }

  addGimbal(g, p, new THREE.Vector3(0, 0.15, 0.02), 0.05);
}

function addGimbal(g: THREE.Group, p: Palette, at: THREE.Vector3, size: number) {
  const trim = mat(p.trim, 0.4, 0.4);
  const yoke = cylinderBetween(at.clone().add(new THREE.Vector3(0, 0.04, 0)), at, 0.006, trim);
  const cam = new THREE.Mesh(new RoundedBoxGeometry(size, size * 0.85, size * 0.9, 3, size * 0.2), mat(p.shell, 0.35, 0.15));
  cam.position.copy(at);
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(size * 0.3, size * 0.34, size * 0.3, 20),
    new THREE.MeshPhysicalMaterial({ color: p.lens, roughness: 0.05, metalness: 0.2, clearcoat: 1 }),
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.copy(at).add(new THREE.Vector3(0, 0, size * 0.5));
  const glass = new THREE.Mesh(
    new THREE.CircleGeometry(size * 0.22, 20),
    new THREE.MeshPhysicalMaterial({ color: 0x3a4a7a, roughness: 0.02, metalness: 0.4, clearcoat: 1 }),
  );
  glass.position.copy(at).add(new THREE.Vector3(0, 0, size * 0.66));
  g.add(yoke, cam, lens, glass);
}

function addCargo(g: THREE.Group, big: boolean) {
  const w = big ? 0.3 : 0.24;
  const h = big ? 0.2 : 0.16;
  const d = big ? 0.24 : 0.2;
  const cardboard = new THREE.MeshStandardMaterial({ color: 0xa87a45, roughness: 0.85 });
  const tape = new THREE.MeshStandardMaterial({ color: 0x17181a, roughness: 0.6 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), cardboard);
  box.position.y = -h / 2 + 0.005;
  g.add(box);
  for (const x of [-w * 0.28, w * 0.28]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.03, h + 0.004, d + 0.004), tape);
    strap.position.set(x, box.position.y, 0);
    g.add(strap);
  }
  const lid = new THREE.Mesh(new THREE.BoxGeometry(w + 0.004, 0.004, 0.035), tape);
  lid.position.set(0, 0.006, 0);
  g.add(lid);
  // lift everything so the box sits on the ground
  g.children.forEach((c) => (c.position.y += h));
}

export function buildDrone(model: DroneModel, variant: DroneVariant, opts: { cargo?: boolean } = {}): DroneRig {
  const rig: DroneRig = { group: new THREE.Group(), props: [], discs: [] };
  const palette = PALETTES[variant];
  if (model === 'Kestrel-V') buildKestrel(palette, rig);
  else buildFalcon(palette, rig);
  if (opts.cargo) addCargo(rig.group, model === 'Kestrel-V');
  rig.group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return rig;
}

/** Spins the rotors; `rate` is revolutions per second (0 = parked). */
export function spinRig(rig: DroneRig, dt: number, rate: number) {
  rig.props.forEach((p, k) => (p.rotation.y += (k % 3 === 0 ? 1 : -1) * rate * Math.PI * 2 * dt));
  const opacity = Math.min(0.28, Math.max(0, (rate - 4) / 30));
  rig.discs.forEach((d) => ((d.material as THREE.MeshBasicMaterial).opacity = opacity));
}

export function disposeObject(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(m)) m.forEach((x) => x.dispose());
    else m?.dispose();
  });
}
