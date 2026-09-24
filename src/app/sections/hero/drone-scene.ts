import * as THREE from 'three';

/**
 * Procedurally-built low-poly UAV + starfield, rendered into a given canvas.
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
  private readonly stars: THREE.Points;

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

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    this.camera.position.set(0, 0.6, 7.5);

    this.scene.fog = new THREE.FogExp2(0x05070f, 0.045);

    this.buildLights();
    this.buildDrone();
    this.stars = this.buildStarfield();

    this.scene.add(this.drone, this.stars);
  }

  // ---- construction ------------------------------------------------------

  private buildLights(): void {
    this.scene.add(new THREE.AmbientLight(0x8899ff, 0.35));

    const cyanKey = new THREE.PointLight(0x3ef2d8, 18, 20, 2);
    cyanKey.position.set(-3.5, 2.2, 3);
    this.scene.add(cyanKey);

    const violetRim = new THREE.PointLight(0x8b6bff, 16, 20, 2);
    violetRim.position.set(3.5, -1.5, -2);
    this.scene.add(violetRim);

    const magentaFill = new THREE.PointLight(0xff4fc0, 8, 18, 2);
    magentaFill.position.set(0, -3, 4);
    this.scene.add(magentaFill);
  }

  private glowSprite(color: number, size: number, opacity: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    const c = new THREE.Color(color);
    gradient.addColorStop(0, `rgba(${c.r * 255}, ${c.g * 255}, ${c.b * 255}, ${opacity})`);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(size, size, 1);
    return sprite;
  }

  private buildDrone(): void {
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0x0d1220,
      metalness: 0.85,
      roughness: 0.28,
      clearcoat: 0.6,
      clearcoatRoughness: 0.25,
      emissive: 0x101a2e,
      emissiveIntensity: 0.4,
    });

    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 1), bodyMat);
    core.scale.set(1, 0.62, 1.3);
    this.drone.add(core);

    // glowing chest seam
    const seam = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.02, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0x3ef2d8 }),
    );
    seam.rotation.x = Math.PI / 2;
    seam.position.y = 0.02;
    this.drone.add(seam);

    // camera gimbal underneath
    const gimbal = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 16, 16),
      new THREE.MeshPhysicalMaterial({ color: 0x14060, metalness: 0.6, roughness: 0.2 }),
    );
    gimbal.position.set(0, -0.55, 0.55);
    this.drone.add(gimbal);
    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.09, 24),
      new THREE.MeshBasicMaterial({ color: 0xff4fc0 }),
    );
    lens.position.set(0, -0.55, 0.79);
    this.drone.add(lens);

    const armMat = new THREE.MeshPhysicalMaterial({
      color: 0x161d30,
      metalness: 0.9,
      roughness: 0.35,
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
        new THREE.TorusGeometry(0.42, 0.025, 8, 32),
        new THREE.MeshBasicMaterial({ color: 0x3ef2d8 }),
      );
      ring.position.set(pos.x, 0.05, pos.z);
      ring.rotation.x = Math.PI / 2;
      this.drone.add(ring);

      const rotor = new THREE.Mesh(
        new THREE.CircleGeometry(0.4, 24),
        new THREE.MeshBasicMaterial({
          color: 0x8b6bff,
          transparent: true,
          opacity: 0.16,
          side: THREE.DoubleSide,
        }),
      );
      rotor.position.set(pos.x, 0.12, pos.z);
      rotor.rotation.x = Math.PI / 2;
      this.drone.add(rotor);
      this.rotors.push(rotor);

      const halo = this.glowSprite(0x3ef2d8, 1.1, 0.55);
      halo.position.set(pos.x, 0.08, pos.z);
      this.drone.add(halo);
    }

    // ambient body glow halo
    const bodyHalo = this.glowSprite(0x8b6bff, 3.4, 0.45);
    bodyHalo.position.set(0, 0, 0);
    this.drone.add(bodyHalo);

    this.drone.position.y = -0.2;
  }

  private buildStarfield(): THREE.Points {
    const count = 900;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 8 + Math.random() * 28;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi) - 6;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xbfe9ff,
      size: 0.045,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return new THREE.Points(geometry, material);
  }

  // ---- public API ----------------------------------------------------

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
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

    this.drone.rotation.y = t * 0.22 * speed + this.pointer.x * 0.4;
    this.drone.rotation.z = Math.sin(t * 0.6 * speed) * 0.05 + this.pointer.y * 0.12;
    this.drone.position.y = -0.2 + Math.sin(t * 0.9 * speed) * 0.18;

    for (const rotor of this.rotors) {
      rotor.rotation.z += 0.55 * speed;
    }

    this.stars.rotation.y = t * 0.01 * speed;

    this.camera.position.x = this.pointer.x * 0.6;
    this.camera.position.y = 0.6 - this.pointer.y * 0.3;
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
      if (obj instanceof THREE.Sprite) {
        obj.material.map?.dispose();
        obj.material.dispose();
      }
    });
    this.renderer.dispose();
  }
}
