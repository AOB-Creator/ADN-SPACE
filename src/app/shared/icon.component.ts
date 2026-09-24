import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IconName =
  | 'mail'
  | 'github'
  | 'behance'
  | 'threads'
  | 'dribbble'
  | 'x'
  | 'linkedin'
  | 'facebook'
  | 'arrow-down'
  | 'sparkle'
  | 'sun'
  | 'moon'
  | 'globe';

@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'icon' },
  template: `
    <svg
      viewBox="0 0 24 24"
      stroke-width="1.6"
      stroke="currentColor"
      fill="none"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      @switch (name()) {
        @case ('mail') {
          <path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z" />
          <path d="M3 7l9 6l9 -6" />
        }
        @case ('github') {
          <path
            d="M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5"
          />
        }
        @case ('behance') {
          <path d="M3 18v-12h4.5a3 3 0 0 1 0 6a3 3 0 0 1 0 6h-4.5" />
          <path d="M3 12l4.5 0" />
          <path d="M14 13h7a3.5 3.5 0 0 0 -7 0v2a3.5 3.5 0 0 0 6.64 1" />
          <path d="M16 6l3 0" />
        }
        @case ('threads') {
          <path
            d="M19 7.5c-1.333 -3 -3.667 -4.5 -7 -4.5c-5 0 -8 2.5 -8 9s3.5 9 8 9s7 -3 7 -5s-1 -5 -7 -5c-2.5 0 -3 1.25 -3 2.5c0 1.5 1 2.5 2.5 2.5c2.5 0 3.5 -1.5 3.5 -5s-2 -4 -3 -4s-1.833 .333 -2.5 1"
          />
        }
        @case ('dribbble') {
          <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
          <path d="M9 3.6c5 6 7 10.5 7.5 16.2" />
          <path d="M6.4 19c3.5 -3.5 6 -6.5 14.5 -6.4" />
          <path d="M3.1 10.75c5 0 9.814 -.38 15.314 -5" />
        }
        @case ('x') {
          <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
          <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
        }
        @case ('linkedin') {
          <path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" />
          <path d="M8 11l0 5" />
          <path d="M8 8l0 .01" />
          <path d="M12 16l0 -5" />
          <path d="M16 16v-3a2 2 0 0 0 -4 0" />
        }
        @case ('facebook') {
          <path
            d="M7 10v4h3v7h4v-7h3l1 -4h-4v-2a1 1 0 0 1 1 -1h3v-4h-3a5 5 0 0 0 -5 5v2h-3"
          />
        }
        @case ('arrow-down') {
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" />
          <path d="M7 11l5 5l5 -5" />
          <path d="M12 4l0 12" />
        }
        @case ('sparkle') {
          <path d="M12 3l1.8 4.9L18.5 9.6l-4.7 1.8L12 16.3l-1.8-4.9L5.5 9.6l4.7-1.7z" />
        }
        @case ('sun') {
          <path d="M12 5.5a6.5 6.5 0 1 0 0 13a6.5 6.5 0 0 0 0 -13z" />
          <path d="M12 1.5v2M12 20.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1.5 12h2M20.5 12h2M4.2 19.8l1.4 -1.4M18.4 5.6l1.4 -1.4" />
        }
        @case ('moon') {
          <path d="M20.5 14.2a8.5 8.5 0 1 1 -10.7 -10.7a7 7 0 0 0 10.7 10.7z" />
        }
        @case ('globe') {
          <path d="M12 3m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
          <path d="M3 12h18M12 3a13.7 13.7 0 0 1 0 18M12 3a13.7 13.7 0 0 0 0 18" />
        }
      }
    </svg>
  `,
  styles: `
    :host.icon {
      display: inline-flex;
      width: 1.35rem;
      height: 1.35rem;
    }

    svg {
      width: 100%;
      height: 100%;
    }
  `,
})
export class IconComponent {
  readonly name = input.required<IconName>();
}
