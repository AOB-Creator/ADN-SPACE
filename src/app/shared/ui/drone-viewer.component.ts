import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { DroneRig, buildDrone, disposeObject, spinRig } from '../../core/three/drone-model';
import { DroneModel, DroneVariant } from '../../core/sim/models';
import { ThemeService } from '../theme.service';

/** Turntable product view of one drone: drag to rotate, rotors spin while it flies. */
@Component({
  selector: 'app-drone-viewer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #canvas></canvas>`,
  styles: `
    :host {
      position: relative;
      display: block;
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
      cursor: grab;
      touch-action: pan-y;
    }
    canvas:active {
      cursor: grabbing;
    }
  `,
})
export class DroneViewerComponent {
  private readonly theme = inject(ThemeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  readonly model = input.required<DroneModel>();
  readonly variant = input.required<DroneVariant>();
  readonly spinning = input(false);
  readonly cargo = input(false);

  private scene?: THREE.Scene;
  private stage = new THREE.Group();
  private rig?: DroneRig;
  private ring?: THREE.Mesh;
  private orbit?: THREE.Line;

  constructor() {
    afterNextRender(() => this.setup());
    effect(() => this.mount(this.model(), this.variant(), this.cargo()));
    effect(() => this.applyTheme(this.theme.theme() === 'dark'));
  }

  private mount(model: DroneModel, variant: DroneVariant, cargo: boolean) {
    if (!this.scene) return;
    if (this.rig) {
      this.stage.remove(this.rig.group);
      disposeObject(this.rig.group);
    }
    this.rig = buildDrone(model, variant, { cargo });
    const box = new THREE.Box3().setFromObject(this.rig.group);
    const size = box.getSize(new THREE.Vector3());
    const s = 1.6 / Math.max(size.x, size.z);
    this.rig.group.scale.setScalar(s);
    const c = box.getCenter(new THREE.Vector3()).multiplyScalar(s);
    this.rig.group.position.set(-c.x, -box.min.y * s + 0.05, -c.z);
    this.stage.add(this.rig.group);
  }

  private applyTheme(dark: boolean) {
    if (!this.ring || !this.orbit) return;
    (this.ring.material as THREE.MeshBasicMaterial).color.setHex(dark ? 0x7c8ff0 : 0x5468d6);
    (this.orbit.material as THREE.LineDashedMaterial).color.setHex(dark ? 0x4a4e57 : 0xb9bdc6);
  }

  private setup() {
    const canvas = this.canvasRef().nativeElement;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;

    const scene = new THREE.Scene();
    this.scene = scene;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.7;
    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(1.5, 3, 2);
    const fill = new THREE.DirectionalLight(0xdfe6ff, 0.4);
    fill.position.set(-2, 1, -1);
    scene.add(key, fill, new THREE.HemisphereLight(0xffffff, 0x9aa0aa, 0.35));

    // orbit ellipse + ground ring the drone hovers over
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.98, 1.0, 96),
      new THREE.MeshBasicMaterial({ color: 0x5468d6, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    this.ring = ring;
    const pts = Array.from({ length: 129 }, (_, k) => {
      const a = (k / 128) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * 1.35, 0, Math.sin(a) * 1.35);
    });
    const orbit = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineDashedMaterial({ color: 0xb9bdc6, dashSize: 0.05, gapSize: 0.05 }),
    );
    orbit.computeLineDistances();
    this.orbit = orbit;
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.75, 48),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.1, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.002;
    scene.add(ring, orbit, shadow, this.stage);

    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
    camera.position.set(0, 1.5, 4.5);
    camera.lookAt(0, 0.42, 0);

    this.mount(this.model(), this.variant(), this.cargo());
    this.applyTheme(this.theme.theme() === 'dark');

    const el = this.host.nativeElement;
    const size = () => {
      const w = Math.max(1, el.clientWidth);
      const h = Math.max(1, el.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(el);

    let yaw = -0.6;
    let velocity = 0.25;
    let dragging: { x: number } | null = null;
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      dragging = { x: e.clientX };
      velocity = 0;
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - dragging.x;
      dragging.x = e.clientX;
      yaw += dx * 0.012;
      velocity = dx * 0.7;
    });
    const end = () => {
      dragging = null;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);

    let frame = 0;
    let last = performance.now();
    let time = 0;
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      time += dt;
      if (!dragging) {
        velocity += (0.25 - velocity) * Math.min(1, dt * 1.5);
        yaw += velocity * dt;
      }
      const flying = this.spinning();
      this.stage.rotation.y = yaw;
      this.stage.position.y = flying ? 0.18 + Math.sin(time * 2.2) * 0.03 : 0;
      if (this.rig) spinRig(this.rig, dt, flying ? 30 : 0);
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(loop);

    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      disposeObject(scene);
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      this.scene = undefined;
    });
  }
}
