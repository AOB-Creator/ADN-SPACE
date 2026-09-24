import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { DroneScene } from './drone-scene';

@Component({
  selector: 'app-hero',
  standalone: true,
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'hero' },
})
export class HeroComponent implements AfterViewInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly stageRef = viewChild.required<ElementRef<HTMLElement>>('stage');

  private scene?: DroneScene;
  private resizeObserver?: ResizeObserver;

  constructor() {
    // WebGL setup must happen after the canvas exists in the DOM.
    afterNextRender(() => this.setupScene());
  }

  ngAfterViewInit(): void {
    /* scene bootstrap happens in afterNextRender to stay SSR-friendly */
  }

  private setupScene(): void {
    const canvas = this.canvasRef().nativeElement;
    const stage = this.stageRef().nativeElement;

    this.scene = new DroneScene(canvas);
    this.scene.setReducedMotion(matchMedia('(prefers-reduced-motion: reduce)').matches);

    const applySize = () => {
      const rect = stage.getBoundingClientRect();
      this.scene?.resize(rect.width, rect.height);
    };
    applySize();

    this.resizeObserver = new ResizeObserver(applySize);
    this.resizeObserver.observe(stage);

    const onPointerMove = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      this.scene?.setPointer(nx, ny);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const onVisibility = () => {
      if (document.hidden) this.scene?.stop();
      else this.scene?.start();
    };
    document.addEventListener('visibilitychange', onVisibility);

    this.scene.start();

    this.destroyRef.onDestroy(() => {
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibility);
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.scene?.dispose();
  }
}
