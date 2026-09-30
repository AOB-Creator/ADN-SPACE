import * as THREE from 'three';

/**
 * Procedurally-built low-poly UAV + soft dust particles, rendered into a
 * given canvas as a clean "product shot" — a dark matte drone lit with a
 * single accent-colored key light, floating over a transparent background
 * so the page's own (light or dark) surface shows through.
 *
 * Kept as a plain class (not a component) so all the imperative WebGL/animation
 * work stays out of Angular's change detection entirely — it drives itself via
 * requestAnimationFrame and is fully torn down in `dispose()`.
 */
export class DroneScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly drone = new THREE.Group();
  private readonly rotors: THREE.Mesh[] = [];
  private readonly dust: THREE.Points;
  private readonly accentLight: THREE.PointLight;
  private readonly fillLight: THREE.PointLight;
  private readonly ambient: THREE.AmbientLight;

  private width = 0;
  private height = 0;
  private frameId = 0;
  private clock = new THREE.Clock();
  private running = false;

  private pointer = { x: 0, y: 0 };
  private targetPointer = { x: 0, y: 0 };
  private reducedMotion = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    this.camera.position.set(0, 0.5, 8);

    this.scene.fog = new THREE.FogExp2(0xf2f3f6, 0.05);

    this.ambient = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(this.ambient);

    this.accentLight = new THREE.PointLight(0x5468d6, 22, 22, 2);
    this.accentLight.position.set(-3.2, 2.4, 3.5);
    this.scene.add(this.accentLight);

    this.fillLight = new THREE.PointLight(0xffffff, 14, 20, 2);
    this.fillLight.position.set(3, -1.5, 2);
    this.scene.add(this.fillLight);

    const rim = new THREE.PointLight(0x7c8ff0, 10, 18, 2);
    rim.position.set(0, -2.5, -3);
    this.scene.add(rim);

    this.buildDrone();
    this.dust = this.buildDust();

    this.scene.add(this.drone, this.dust);
  }

  // ---- construction ------------------------------------------------------

  private buildDrone(): void {
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0x1c1e21,
      metalness: 0.55,
      roughness: 0.38,
      clearcoat: 0.5,
      clearcoatRoughness: 0.3,
    });

    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 1), bodyMat);
    core.scale.set(1, 0.62, 1.3);
    this.drone.add(core);

    // accent seam
    const seam = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.018, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0x5468d6 }),
    );
    seam.rotation.x = Math.PI / 2;
    seam.position.y = 0.02;
    this.drone.add(seam);

    // camera gimbal underneath
    const gimbal = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 16, 16),
      new THREE.MeshPhysicalMaterial({ color: 0x101114, metalness: 0.5, roughness: 0.25 }),
    );
    gimbal.position.set(0, -0.55, 0.55);
    this.drone.add(gimbal);
    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.09, 24),
      new THREE.MeshBasicMaterial({ color: 0x5468d6 }),
    );
    lens.position.set(0, -0.55, 0.79);
    this.drone.add(lens);

    const armMat = new THREE.MeshPhysicalMaterial({
      color: 0x2a2c30,
      metalness: 0.6,
      roughness: 0.42,
    });

    const armPositions = [
      { x: 1.55, z: 1.15 },
      { x: -1.55, z: 1.15 },
      { x: 1.55, z: -1.15 },
      { x: -1.55, z: -1.15 },
    ];

    for (const pos of armPositions) {
      const armLength = Math.hypot(pos.x, pos.z);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, armLength, 12), armMat);
      arm.position.set(pos.x / 2, 0, pos.z / 2);
      arm.rotation.z = Math.PI / 2;
      arm.rotation.y = Math.atan2(pos.x, pos.z);
      this.drone.add(arm);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 16), armMat);
      hub.position.set(pos.x, 0.05, pos.z);
      this.drone.add(hub);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.02, 8, 32),
        new THREE.MeshBasicMaterial({ color: 0x5468d6, transparent: true, opacity: 0.85 }),
      );
      ring.position.set(pos.x, 0.05, pos.z);
      ring.rotation.x = Math.PI / 2;
      this.drone.add(ring);

      const rotor = new THREE.Mesh(
        new THREE.CircleGeometry(0.4, 24),
        new THREE.MeshBasicMaterial({
          color: 0x9297a1,
          transparent: true,
          opacity: 0.14,
          side: THREE.DoubleSide,
        }),
      );
      rotor.position.set(pos.x, 0.12, pos.z);
      rotor.rotation.x = Math.PI / 2;
      this.drone.add(rotor);
      this.rotors.push(rotor);
    }

    this.drone.position.set(1.7, -0.2, 0);
  }

  private buildDust(): THREE.Points {
    const count = 260;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 3 + Math.random() * 9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.6;
      positions[i * 3 + 2] = radius * Math.cos(phi) - 4;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x9aa3c2,
      size: 0.035,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });

    return new THREE.Points(geometry, material);
  }

  // ---- public API ----------------------------------------------------

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
  }

  /** Swap fog/ambient balance so the scene reads correctly against either theme's page background. */
  setTheme(isDark: boolean): void {
    const fogColor = isDark ? 0x101114 : 0xf2f3f6;
    (this.scene.fog as THREE.FogExp2).color.setHex(fogColor);
    this.ambient.intensity = isDark ? 0.55 : 0.9;
    this.fillLight.intensity = isDark ? 20 : 14;
  }

  setPointer(nx: number, ny: number): void {
    // nx, ny expected in [-1, 1]
    this.targetPointer.x = nx;
    this.targetPointer.y = ny;
  }

  resize(width: number, height: number): void {
    this.width = Math.max(width, 1);
    this.height = Math.max(height, 1);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height, false);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    const tick = () => {
      if (!this.running) return;
      this.frameId = requestAnimationFrame(tick);
      this.render();
    };
    tick();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frameId);
  }

  private render(): void {
    const t = this.clock.getElapsedTime();
    const speed = this.reducedMotion ? 0.15 : 1;

    this.pointer.x += (this.targetPointer.x - this.pointer.x) * 0.04;
    this.pointer.y += (this.targetPointer.y - this.pointer.y) * 0.04;

    this.drone.rotation.y = t * 0.2 * speed + this.pointer.x * 0.4;
    this.drone.rotation.z = Math.sin(t * 0.6 * speed) * 0.05 + this.pointer.y * 0.12;
    this.drone.position.y = -0.2 + Math.sin(t * 0.9 * speed) * 0.16;

    for (const rotor of this.rotors) {
      rotor.rotation.z += 0.55 * speed;
    }

    this.dust.rotation.y = t * 0.015 * speed;

    this.camera.position.x = this.pointer.x * 0.6;
    this.camera.position.y = 0.5 - this.pointer.y * 0.3;
    this.camera.lookAt(0, -0.1, 0);

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.stop();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        obj.geometry.dispose();
        const material = obj.material;
        if (Array.isArray(material)) {
          material.forEach((m) => m.dispose());
        } else {
          material.dispose();
        }
      }
    });
    this.renderer.dispose();
  }
}
