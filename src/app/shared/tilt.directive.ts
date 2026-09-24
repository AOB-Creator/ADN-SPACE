import { Directive, ElementRef, HostListener, inject, input } from '@angular/core';

/**
 * Cheap 3D tilt-on-hover for glass cards — pointer-driven perspective rotation
 * plus a CSS-variable-based glare highlight. Skipped for touch/coarse pointers
 * and reduced-motion users.
 */
@Directive({
  selector: '[appTilt]',
  host: {
    class: 'tilt-card',
  },
})
export class TiltDirective {
  private readonly el = inject(ElementRef<HTMLElement>);
  readonly strength = input(10, { alias: 'appTilt' });

  private readonly reduceMotion =
    typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches;
  private readonly isCoarsePointer =
    typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

  @HostListener('pointermove', ['$event'])
  onMove(event: PointerEvent): void {
    if (this.reduceMotion || this.isCoarsePointer) return;

    const node = this.el.nativeElement;
    const rect = node.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    const max = this.strength();

    const rotateX = (0.5 - py) * max;
    const rotateY = (px - 0.5) * max;

    node.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`;
    node.style.setProperty('--glare-x', `${px * 100}%`);
    node.style.setProperty('--glare-y', `${py * 100}%`);
  }

  @HostListener('pointerleave')
  onLeave(): void {
    this.el.nativeElement.style.transform = '';
  }
}
