import {
  Directive,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  input,
  numberAttribute,
} from '@angular/core';

/**
 * Adds `data-reveal` + toggles `is-visible` once the host scrolls into view.
 * Pure IntersectionObserver — no scroll listeners, no animation library needed
 * for the base reveal-on-scroll effect used across every section.
 */
@Directive({
  selector: '[appReveal]',
  host: {
    '[attr.data-reveal]': "''",
    '[style.--reveal-delay.ms]': 'delay()',
  },
})
export class RevealDirective implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  readonly delay = input(0, { alias: 'appReveal', transform: numberAttribute });

  ngOnInit(): void {
    const node = this.el.nativeElement;

    if (typeof IntersectionObserver === 'undefined') {
      node.classList.add('is-visible');
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            node.classList.add('is-visible');
            this.observer?.unobserve(node);
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );

    this.observer.observe(node);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
