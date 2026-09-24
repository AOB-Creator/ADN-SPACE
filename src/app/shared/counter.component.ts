import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  input,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-counter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'counter' },
  template: `{{ display() }}{{ suffix() }}`,
})
export class CounterComponent implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);

  readonly value = input.required<number>();
  readonly suffix = input('');
  readonly duration = input(1400);

  protected readonly display = signal(0);
  private observer?: IntersectionObserver;

  ngOnInit(): void {
    if (typeof IntersectionObserver === 'undefined') {
      this.display.set(this.value());
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.animate();
            this.observer?.disconnect();
          }
        }
      },
      { threshold: 0.6 },
    );
    this.observer.observe(this.el.nativeElement);
  }

  private animate(): void {
    const target = this.value();
    const start = performance.now();
    const total = this.duration();

    const step = (now: number) => {
      const progress = Math.min((now - start) / total, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.display.set(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
