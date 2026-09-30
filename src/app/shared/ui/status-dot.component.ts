import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type Tone = 'accent' | 'success' | 'danger' | 'warning' | 'muted';

@Component({
  selector: 'app-status',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'status', '[attr.data-tone]': 'tone()' },
  template: `<span class="status__dot"></span><span class="status__label"><ng-content /></span>`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.78rem;
      color: var(--text-mid);
      white-space: nowrap;
    }
    .status__dot {
      width: 0.36rem;
      height: 0.36rem;
      border-radius: 999px;
      background: var(--text-lo);
      flex-shrink: 0;
    }
    :host([data-tone='accent']) .status__dot { background: var(--accent); }
    :host([data-tone='success']) .status__dot { background: var(--success); }
    :host([data-tone='danger']) .status__dot { background: var(--danger); }
    :host([data-tone='warning']) .status__dot { background: var(--warning); }
  `,
})
export class StatusDotComponent {
  readonly tone = input<Tone>('muted');
}
