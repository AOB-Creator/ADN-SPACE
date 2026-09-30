import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FleetSimService } from '../sim/fleet-sim.service';
import { DroneState } from '../sim/models';
import { Vec2, World } from '../sim/world';
import { DroneRig, buildDrone, disposeObject, spinRig } from './drone-model';
import type { OverviewLayer } from '../ui-state.service';

export type CityMode = 'iso' | 'follow' | 'pov';

export interface CityOptions {
  mode: CityMode;
  shadows: boolean;
  /** Draw every drone's route, or only the focused one. */
  routes: 'all' | 'focus';
}

interface DroneEntry {
  drone: DroneState;
  root: THREE.Group;
  tilt: THREE.Group;
  rig: DroneRig;
  blob: THREE.Mesh;
  route: THREE.Mesh | null;
  routeKey: string;
}

interface Palette {
  ground: number;
  plate: number;
  park: number;
  wall: number;
  roof: number;
  tree: number;
  fence: number;
  fog: number;
}

const LIGHT: Palette = {
  ground: 0xe9eaee,
  plate: 0xf6f6f8,
  park: 0xeef1ec,
  wall: 0xfafafb,
  roof: 0xf1f1f4,
  tree: 0xf4f5f4,
  fence: 0xe2e3e8,
  fog: 0xf2f3f6,
};

const DARK: Palette = {
  ground: 0x16181c,
  plate: 0x1d1f24,
  park: 0x1c211f,
  wall: 0x2a2d33,
  roof: 0x33363d,
  tree: 0x2b3033,
  fence: 0x26292f,
  fog: 0x101114,
};

const DRONE_SCALE = 42;
const ALT_SCALE = 0.55;
const ISO_DIR = new THREE.Vector3(1, 1.05, 1).normalize();
const SUN_DIR = new THREE.Vector3(-0.55, 1, 0.35).normalize();

export class CityRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly world: World;

  private readonly ortho: THREE.OrthographicCamera;
  private readonly persp: THREE.PerspectiveCamera;
  private readonly target = new THREE.Vector3();
  private readonly desiredTarget = new THREE.Vector3();
  private zoom = 1;
  private desiredZoom = 1;
  private azimuth = 0;
  private width = 1;
  private height = 1;
  private focusId: string | null = null;
  private followFocus = true;
  private dark = false;
  private bottomInset = 0;

  private readonly sun: THREE.DirectionalLight;
  private readonly hemi: THREE.HemisphereLight;
  private readonly materials: Record<keyof Palette, THREE.MeshStandardMaterial>;
  private readonly cityGroup = new THREE.Group();
  private readonly zoneGroup = new THREE.Group();
  private readonly droneGroup = new THREE.Group();
  private readonly routeGroup = new THREE.Group();
  private readonly weatherGroup = new THREE.Group();
  private readonly drones = new Map<string, DroneEntry>();
  private readonly zoneMeshes = new Map<string, THREE.Object3D>();
  private readonly routeMat = new THREE.MeshBasicMaterial({ color: 0x5468d6, transparent: true, opacity: 0.85, depthWrite: false });
  private readonly routeFocusMat = new THREE.MeshBasicMaterial({ color: 0x5468d6, transparent: true, opacity: 1, depthWrite: false });
  private readonly hatchTexture: THREE.Texture;
  private readonly warnTexture: THREE.Texture;
  private readonly blobTexture: THREE.Texture;
  private readonly cloudTexture: THREE.Texture;
  private routeTimer = 0;
  private time = 0;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly sim: FleetSimService,
    private readonly options: CityOptions,
  ) {
    this.world = sim.world;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, options.mode === 'pov' ? 1 : 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = options.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 6000);
    this.persp = new THREE.PerspectiveCamera(58, 1, 2, 4000);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0xc9ccd6, 1.35);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.6);
    this.sun.castShadow = options.shadows;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.6;
    this.scene.add(this.hemi, this.sun, this.sun.target);
    this.scene.fog = new THREE.Fog(LIGHT.fog, 2600, 5200);

    const m = (color: number, roughness = 0.95) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
    this.materials = {
      ground: m(LIGHT.ground),
      plate: m(LIGHT.plate),
      park: m(LIGHT.park),
      wall: m(LIGHT.wall, 0.9),
      roof: m(LIGHT.roof, 0.85),
      tree: m(LIGHT.tree, 1),
      fence: m(LIGHT.fence),
      fog: m(LIGHT.fog),
    };

    this.hatchTexture = this.makeHatchTexture();
    this.warnTexture = this.makeWarnTexture();
    this.blobTexture = this.makeBlobTexture();
    this.cloudTexture = this.makeCloudTexture();

    this.buildCity();
    this.buildWeather();
    this.scene.add(this.cityGroup, this.zoneGroup, this.routeGroup, this.droneGroup, this.weatherGroup);

    this.resetView(true);
  }

  // ---- construction --------------------------------------------------------

  private buildCity() {
    const w = this.world;
    const X = (x: number) => x - w.width / 2;
    const Z = (y: number) => y - w.height / 2;

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(w.width + 1600, w.height + 1600), this.materials.ground);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const unitBox = new THREE.BoxGeometry(1, 1, 1);
    unitBox.translate(0, 0.5, 0);
    const dummy = new THREE.Object3D();

    // block plates (lots / parks)
    const plates = w.blocks;
    const plateMesh = new THREE.InstancedMesh(unitBox, this.materials.plate, plates.length);
    const parkColor = new THREE.Color();
    plates.forEach((b, k) => {
      dummy.position.set(X(b.rect.x + b.rect.w / 2), 0, Z(b.rect.y + b.rect.h / 2));
      dummy.scale.set(b.rect.w, 0.5, b.rect.h);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      plateMesh.setMatrixAt(k, dummy.matrix);
      plateMesh.setColorAt(k, parkColor.setHex(b.kind === 'park' ? 0xf1f4ef : 0xffffff));
    });
    plateMesh.receiveShadow = true;
    this.cityGroup.add(plateMesh);

    // diagonal avenue painted over the plates
    const d = w.diagonal;
    const len = Math.hypot(d.b.x - d.a.x, d.b.y - d.a.y);
    const avenue = new THREE.Mesh(new THREE.PlaneGeometry(len, d.width), this.materials.ground);
    avenue.rotation.x = -Math.PI / 2;
    avenue.rotation.z = -Math.atan2(d.b.y - d.a.y, d.b.x - d.a.x);
    avenue.position.set(X((d.a.x + d.b.x) / 2), 0.55, Z((d.a.y + d.b.y) / 2));
    avenue.receiveShadow = true;
    this.cityGroup.add(avenue);

    // fences along parcel lines
    const segs: number[][] = [];
    for (const b of w.blocks) {
      for (let k = 0; k < b.lines.length; k += 4) segs.push(b.lines.slice(k, k + 4));
    }
    const fences = new THREE.InstancedMesh(unitBox, this.materials.fence, segs.length);
    segs.forEach(([x1, y1, x2, y2], k) => {
      const l = Math.hypot(x2 - x1, y2 - y1);
      dummy.position.set(X((x1 + x2) / 2), 0.5, Z((y1 + y2) / 2));
      dummy.rotation.set(0, -Math.atan2(y2 - y1, x2 - x1), 0);
      dummy.scale.set(l, 1.1, 0.35);
      dummy.updateMatrix();
      fences.setMatrixAt(k, dummy.matrix);
    });
    fences.receiveShadow = true;
    this.cityGroup.add(fences);

    // buildings
    const houses = w.buildings;
    const bodies = new THREE.InstancedMesh(unitBox, this.materials.wall, houses.length);
    const hip = houses.filter((b) => b.roof === 'hip');
    const roofGeo = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1);
    roofGeo.rotateY(Math.PI / 4);
    roofGeo.translate(0, 0.5, 0);
    const roofs = new THREE.InstancedMesh(roofGeo, this.materials.roof, hip.length);
    houses.forEach((b, k) => {
      dummy.position.set(X(b.x), 0.5, Z(b.y));
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(b.w, b.h, b.d);
      dummy.updateMatrix();
      bodies.setMatrixAt(k, dummy.matrix);
    });
    hip.forEach((b, k) => {
      dummy.position.set(X(b.x), 0.5 + b.h, Z(b.y));
      dummy.scale.set(b.w * 1.12, b.roofH, b.d * 1.12);
      dummy.updateMatrix();
      roofs.setMatrixAt(k, dummy.matrix);
    });
    for (const mesh of [bodies, roofs]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.cityGroup.add(mesh);
    }

    // trees: canopy blob + trunk
    const canopyGeo = new THREE.IcosahedronGeometry(1, 1);
    const canopies = new THREE.InstancedMesh(canopyGeo, this.materials.tree, w.trees.length);
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 1, 6);
    trunkGeo.translate(0, 0.5, 0);
    const trunks = new THREE.InstancedMesh(trunkGeo, this.materials.fence, w.trees.length);
    w.trees.forEach((t, k) => {
      const trunkH = t.r * 0.9;
      dummy.position.set(X(t.x), 0.5, Z(t.y));
      dummy.rotation.set(0, (k * 1.7) % Math.PI, 0);
      dummy.scale.set(1, trunkH, 1);
      dummy.updateMatrix();
      trunks.setMatrixAt(k, dummy.matrix);
      dummy.position.set(X(t.x), 0.5 + trunkH + t.r * 0.85, Z(t.y));
      dummy.scale.set(t.r, t.r * 1.05, t.r);
      dummy.updateMatrix();
      canopies.setMatrixAt(k, dummy.matrix);
    });
    for (const mesh of [canopies, trunks]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.cityGroup.add(mesh);
    }

    // warehouse drone pads
    const padMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x5468d6 });
    for (const wh of w.warehouses) {
      for (const s of wh.spots) {
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 0.4, 24), padMat);
        pad.position.set(X(s.x), 0.7, Z(s.y));
        pad.receiveShadow = true;
        const ring = new THREE.Mesh(new THREE.RingGeometry(5.6, 6.3, 32), ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(X(s.x), 0.95, Z(s.y));
        this.cityGroup.add(pad, ring);
      }
    }
  }

  private buildWeather() {
    const mat = new THREE.SpriteMaterial({ map: this.cloudTexture, transparent: true, opacity: 0.55, depthWrite: false });
    for (let k = 0; k < 14; k++) {
      const s = new THREE.Sprite(mat);
      const size = 220 + (k % 5) * 70;
      s.scale.set(size, size * 0.55, 1);
      s.position.set(
        ((k * 397) % this.world.width) - this.world.width / 2,
        210 + (k % 3) * 40,
        ((k * 251) % this.world.height) - this.world.height / 2,
      );
      this.weatherGroup.add(s);
    }
    this.weatherGroup.visible = false;
  }

  private makeCanvas(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d')!);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }

  private makeHatchTexture() {
    const t = this.makeCanvas(64, 64, (ctx) => {
      ctx.clearRect(0, 0, 64, 64);
      ctx.strokeStyle = 'rgba(214, 72, 72, 0.9)';
      ctx.lineWidth = 9;
      for (let k = -64; k < 128; k += 22) {
        ctx.beginPath();
        ctx.moveTo(k, 64);
        ctx.lineTo(k + 64, 0);
        ctx.stroke();
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  private makeWarnTexture() {
    return this.makeCanvas(128, 128, (ctx) => {
      ctx.fillStyle = '#d64848';
      ctx.beginPath();
      ctx.moveTo(64, 14);
      ctx.quadraticCurveTo(70, 12, 74, 20);
      ctx.lineTo(118, 100);
      ctx.quadraticCurveTo(121, 112, 110, 112);
      ctx.lineTo(18, 112);
      ctx.quadraticCurveTo(7, 112, 10, 100);
      ctx.lineTo(54, 20);
      ctx.quadraticCurveTo(58, 12, 64, 14);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(59, 44, 10, 36);
      ctx.beginPath();
      ctx.arc(64, 94, 6, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private makeBlobTexture() {
    return this.makeCanvas(64, 64, (ctx) => {
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(20,22,30,0.35)');
      g.addColorStop(1, 'rgba(20,22,30,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
    });
  }

  private makeCloudTexture() {
    return this.makeCanvas(128, 128, (ctx) => {
      const puffs = [
        [64, 70, 40],
        [40, 76, 28],
        [90, 76, 30],
        [60, 52, 30],
      ];
      for (const [x, y, r] of puffs) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(255,255,255,0.95)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
      }
    });
  }

  // ---- public API ------------------------------------------------------------

  setTheme(dark: boolean) {
    this.dark = dark;
    const p = dark ? DARK : LIGHT;
    (Object.keys(this.materials) as (keyof Palette)[]).forEach((k) => this.materials[k].color.setHex(p[k]));
    (this.scene.fog as THREE.Fog).color.setHex(p.fog);
    this.hemi.intensity = dark ? 0.55 : 1.35;
    this.hemi.groundColor.setHex(dark ? 0x0b0c0f : 0xc9ccd6);
    this.sun.intensity = dark ? 0.9 : 1.6;
    this.routeMat.color.setHex(dark ? 0x7c8ff0 : 0x5468d6);
    this.routeFocusMat.color.setHex(dark ? 0x8fa0f3 : 0x4558c4);
  }

  setLayers(layers: Record<OverviewLayer, boolean>) {
    this.cityGroup.children.forEach((c, k) => {
      // keep plates + avenue (first two children) as the base map
      if (k > 1) c.visible = layers.aerial;
    });
    this.routeGroup.visible = layers.routes;
    this.weatherGroup.visible = layers.weather;
    this.droneGroup.visible = layers.drones;
    this.zoneGroup.visible = layers.zones;
  }

  setSize(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.renderer.setSize(this.width, this.height, false);
    this.persp.aspect = this.width / this.height;
    this.persp.updateProjectionMatrix();
    this.updateOrtho();
  }

  /** Keep the view centred above an overlay covering the bottom `px` of the canvas. */
  setBottomInset(px: number) {
    this.bottomInset = Math.max(0, Math.min(px, this.height * 0.6));
    this.updateOrtho();
  }

  setFocus(droneId: string | null) {
    this.focusId = droneId;
    this.followFocus = true;
  }

  zoomBy(factor: number) {
    this.desiredZoom = THREE.MathUtils.clamp(this.desiredZoom * factor, 0.35, 5);
  }

  rotateBy(radians: number) {
    this.azimuth += radians;
  }

  /** Drag the map by a screen-space delta (px). */
  pan(dx: number, dy: number) {
    this.followFocus = false;
    const worldPerPx = this.frustumHeight() / (this.height + this.bottomInset);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.azimuth + Math.PI / 4);
    const fwd = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.azimuth + Math.PI / 4);
    const iso = 1 / Math.sin(Math.asin(ISO_DIR.y));
    this.desiredTarget.addScaledVector(right, -dx * worldPerPx);
    this.desiredTarget.addScaledVector(fwd, dy * worldPerPx * iso);
    this.clampTarget();
  }

  resetView(immediate = false) {
    this.azimuth = 0;
    this.followFocus = true;
    this.desiredZoom = this.options.mode === 'follow' ? 2.1 : 0.92;
    this.desiredTarget.set(40, 0, -60);
    if (immediate) {
      this.zoom = this.desiredZoom;
      this.target.copy(this.desiredTarget);
    }
  }

  /** Screen position (css px) of a world point at a given altitude, or null if behind the camera. */
  project(p: Vec2, alt: number): { x: number; y: number } | null {
    const v = this.worldToScene(p, alt).project(this.activeCamera());
    if (v.z > 1) return null;
    return { x: ((v.x + 1) / 2) * this.width, y: ((1 - v.y) / 2) * this.height };
  }

  droneScreen(id: string) {
    const d = this.sim.drone(id);
    if (!d) return null;
    return this.project(d.pos, this.visualAlt(d) + 16);
  }

  render(dt: number) {
    this.time += dt;
    this.syncDrones(dt);
    this.routeTimer -= dt;
    if (this.routeTimer <= 0) {
      this.routeTimer = 0.25;
      this.syncRoutes();
      this.syncZones();
    }
    this.weatherGroup.children.forEach((c, k) => {
      c.position.x += (6 + (k % 3) * 2) * Math.max(dt, 0.016) * 0.6;
      if (c.position.x > this.world.width / 2 + 300) c.position.x = -this.world.width / 2 - 300;
    });
    this.updateCamera();
    this.renderer.render(this.scene, this.activeCamera());
  }

  dispose() {
    for (const e of this.drones.values()) disposeObject(e.root);
    disposeObject(this.scene);
    [this.hatchTexture, this.warnTexture, this.blobTexture, this.cloudTexture].forEach((t) => t.dispose());
    this.renderer.dispose();
  }

  // ---- per-frame sync ---------------------------------------------------------

  private worldToScene(p: Vec2, alt: number) {
    return new THREE.Vector3(p.x - this.world.width / 2, alt, p.y - this.world.height / 2);
  }

  private visualAlt(d: DroneState) {
    return d.alt * ALT_SCALE + (d.status === 'idle' || d.status === 'charging' || d.status === 'maintenance' ? 1 : 0);
  }

  private syncDrones(dt: number) {
    const seen = new Set<string>();
    for (const d of this.sim.drones) {
      seen.add(d.id);
      let e = this.drones.get(d.id);
      if (!e) e = this.createDroneEntry(d);
      const pos = this.worldToScene(d.pos, this.visualAlt(d));
      e.root.position.copy(pos);
      e.root.rotation.y = -d.heading - Math.PI / 2;
      const moving = d.status === 'flying' || d.status === 'returning';
      e.tilt.rotation.x = THREE.MathUtils.degToRad(moving ? -d.pitch * 0.9 : 0);
      e.tilt.rotation.z = THREE.MathUtils.degToRad(moving ? d.roll * 0.8 : 0);
      if (moving) e.tilt.position.y = Math.sin(this.time * 2 + d.cruiseAlt) * 0.6;
      spinRig(e.rig, Math.max(dt, 0.016), moving ? 38 : d.alt > 1 ? 20 : 0);

      e.blob.position.set(pos.x, 0.9, pos.z);
      const s = moving ? 26 : 14;
      e.blob.scale.set(s, s, 1);
      (e.blob.material as THREE.MeshBasicMaterial).opacity = moving ? 0.55 : 0.9;
      e.root.visible = true;

      const focused = d.id === this.focusId;
      e.root.scale.setScalar(DRONE_SCALE * (focused && this.options.mode !== 'pov' ? 1.2 : 1));
      if (this.options.mode === 'pov' && focused) e.root.visible = false;
    }
    for (const [id, e] of this.drones) {
      if (!seen.has(id)) {
        this.droneGroup.remove(e.root, e.blob);
        disposeObject(e.root);
        this.drones.delete(id);
      }
    }
  }

  private createDroneEntry(d: DroneState): DroneEntry {
    const rig = buildDrone(d.model, d.variant);
    rig.group.traverse((o) => {
      o.castShadow = false;
      o.receiveShadow = false;
    });
    const tilt = new THREE.Group();
    tilt.add(rig.group);
    const root = new THREE.Group();
    root.add(tilt);
    const blob = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: this.blobTexture, transparent: true, depthWrite: false }),
    );
    blob.rotation.x = -Math.PI / 2;
    this.droneGroup.add(root, blob);
    const entry: DroneEntry = { drone: d, root, tilt, rig, blob, route: null, routeKey: '' };
    this.drones.set(d.id, entry);
    return entry;
  }

  private syncRoutes() {
    for (const e of this.drones.values()) {
      const d = e.drone;
      const show =
        !!d.path &&
        (d.status === 'flying' || d.status === 'returning') &&
        (this.options.routes === 'all' || d.id === this.focusId);
      if (!show) {
        if (e.route) {
          this.routeGroup.remove(e.route);
          e.route.geometry.dispose();
          e.route = null;
        }
        continue;
      }
      const key = `${d.path!.length}:${Math.round(d.travelled / 8)}:${d.path![d.path!.length - 1].x}`;
      if (key === e.routeKey && e.route) continue;
      e.routeKey = key;
      if (e.route) {
        this.routeGroup.remove(e.route);
        e.route.geometry.dispose();
      }
      const remaining = this.remainingPath(d);
      const focused = d.id === this.focusId;
      const geo = this.ribbon(remaining, focused ? 5 : d.status === 'returning' ? 2 : 3.2);
      e.route = new THREE.Mesh(geo, focused ? this.routeFocusMat : this.routeMat);
      e.route.renderOrder = 2;
      this.routeGroup.add(e.route);
    }
  }

  private remainingPath(d: DroneState): Vec2[] {
    const path = d.path!;
    let acc = 0;
    for (let k = 1; k < path.length; k++) {
      const len = Math.hypot(path[k].x - path[k - 1].x, path[k].y - path[k - 1].y);
      if (acc + len >= d.travelled) return [d.pos, ...path.slice(k)];
      acc += len;
    }
    return [d.pos, path[path.length - 1]];
  }

  /** Flat ribbon along a polyline, hovering just above the plates. */
  private ribbon(points: Vec2[], width: number) {
    const parts: THREE.BufferGeometry[] = [];
    for (let k = 1; k < points.length; k++) {
      const a = points[k - 1];
      const b = points[k];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 0.5) continue;
      const g = new THREE.PlaneGeometry(len + width, width);
      g.rotateX(-Math.PI / 2);
      g.rotateY(-Math.atan2(b.y - a.y, b.x - a.x));
      const mid = this.worldToScene({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, 1.2);
      g.translate(mid.x, mid.y, mid.z);
      parts.push(g);
    }
    const merged = parts.length ? mergeGeometries(parts) : new THREE.BufferGeometry();
    parts.forEach((p) => p.dispose());
    return merged;
  }

  private syncZones() {
    const live = new Set(this.sim.zones.map((z) => z.id));
    for (const [id, obj] of this.zoneMeshes) {
      if (!live.has(id)) {
        this.zoneGroup.remove(obj);
        disposeObject(obj);
        this.zoneMeshes.delete(id);
      }
    }
    for (const z of this.sim.zones) {
      if (this.zoneMeshes.has(z.id)) continue;
      const g = new THREE.Group();
      const tex = this.hatchTexture.clone();
      tex.needsUpdate = true;
      tex.repeat.set(z.rect.w / 26, z.rect.h / 26);
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(z.rect.w, z.rect.h),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.85, depthWrite: false }),
      );
      plane.rotation.x = -Math.PI / 2;
      const c = this.worldToScene(z.center, 1.5);
      plane.position.copy(c);
      const warn = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.warnTexture, depthWrite: false }));
      warn.scale.set(22, 22, 1);
      warn.position.set(c.x, 16, c.z);
      g.add(plane, warn);
      this.zoneGroup.add(g);
      this.zoneMeshes.set(z.id, g);
    }
  }

  // ---- camera -------------------------------------------------------------

  private frustumHeight() {
    return (this.options.mode === 'follow' ? 620 : 760) / this.zoom;
  }

  private updateOrtho() {
    const fullH = this.height + this.bottomInset;
    const h = this.frustumHeight();
    const w = h * (this.width / fullH);
    this.ortho.left = -w / 2;
    this.ortho.right = w / 2;
    this.ortho.top = h / 2;
    this.ortho.bottom = -h / 2;
    if (this.bottomInset > 0) this.ortho.setViewOffset(this.width, fullH, 0, this.bottomInset, this.width, this.height);
    else this.ortho.clearViewOffset();
  }

  private clampTarget() {
    const hw = this.world.width / 2 + 200;
    const hh = this.world.height / 2 + 200;
    this.desiredTarget.x = THREE.MathUtils.clamp(this.desiredTarget.x, -hw, hw);
    this.desiredTarget.z = THREE.MathUtils.clamp(this.desiredTarget.z, -hh, hh);
  }

  private activeCamera(): THREE.Camera {
    return this.options.mode === 'pov' ? this.persp : this.ortho;
  }

  private updateCamera() {
    const focus = this.sim.drone(this.focusId);
    if (focus && this.followFocus && this.options.mode !== 'iso') {
      const p = this.worldToScene(focus.pos, this.options.mode === 'follow' ? this.visualAlt(focus) * 0.8 : 0);
      this.desiredTarget.copy(p);
    }

    this.target.lerp(this.desiredTarget, this.options.mode === 'pov' ? 1 : 0.12);
    this.zoom += (this.desiredZoom - this.zoom) * 0.15;

    if (this.options.mode === 'pov' && focus) {
      const eye = this.worldToScene(focus.pos, this.visualAlt(focus) + 6);
      const fwd = new THREE.Vector3(Math.cos(focus.heading), 0, Math.sin(focus.heading));
      this.persp.position.copy(eye).addScaledVector(fwd, -10);
      this.persp.lookAt(eye.clone().addScaledVector(fwd, 120).setY(eye.y * 0.2));
    } else {
      const dir = ISO_DIR.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.azimuth);
      this.ortho.position.copy(this.target).addScaledVector(dir, 2400);
      this.ortho.lookAt(this.target);
      this.updateOrtho();
    }

    if (this.options.shadows) {
      const span = this.frustumHeight() * 1.6;
      const cam = this.sun.shadow.camera;
      cam.left = -span;
      cam.right = span;
      cam.top = span;
      cam.bottom = -span;
      cam.near = 10;
      cam.far = 4000;
      cam.updateProjectionMatrix();
      this.sun.position.copy(this.target).addScaledVector(SUN_DIR, 1600);
      this.sun.target.position.copy(this.target);
    }
  }
}
