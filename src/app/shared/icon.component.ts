import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Inline stroke icons (24×24, tabler-style). Filled variants are drawn with
 * `fill="currentColor"` on the individual path.
 */
const ICONS = {
  mail: '<path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="m3 7 9 6 9-6"/>',
  github:
    '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
  behance: '<path d="M3 18V6h4.5a3 3 0 0 1 0 6 3 3 0 0 1 0 6H3M3 12h4.5M14 13h7a3.5 3.5 0 0 0-7 0v2a3.5 3.5 0 0 0 6.64 1M16 6h3"/>',
  threads:
    '<path d="M19 7.5C17.67 4.5 15.33 3 12 3 7 3 4 5.5 4 12s3.5 9 8 9 7-3 7-5-1-5-7-5c-2.5 0-3 1.25-3 2.5 0 1.5 1 2.5 2.5 2.5 2.5 0 3.5-1.5 3.5-5s-2-4-3-4-1.83.33-2.5 1"/>',
  dribbble: '<circle cx="12" cy="12" r="9"/><path d="M9 3.6c5 6 7 10.5 7.5 16.2M6.4 19c3.5-3.5 6-6.5 14.5-6.4M3.1 10.75c5 0 9.81-.38 15.31-5"/>',
  x: '<path d="m4 4 11.73 16H20L8.27 4zM4 20l6.77-6.77m2.46-2.46L20 4"/>',
  linkedin: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 11v5M8 8v.01M12 16v-5M16 16v-3a2 2 0 0 0-4 0"/>',
  facebook: '<path d="M7 10v4h3v7h4v-7h3l1-4h-4V8a1 1 0 0 1 1-1h3V3h-3a5 5 0 0 0-5 5v2z"/>',
  'arrow-down': '<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 11l5 5 5-5M12 4v12"/>',
  sparkle: '<path d="m12 3 1.8 4.9 4.7 1.7-4.7 1.8L12 16.3l-1.8-4.9-4.7-1.8 4.7-1.7z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  moon: '<path d="M12 3h.4a7.5 7.5 0 0 0 7.8 12.4A9 9 0 1 1 12 3z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8M3.6 15h16.8M11.5 3a17 17 0 0 0 0 18M12.5 3a17 17 0 0 1 0 18"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
  route: '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8"/>',
  list: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 12h8M8 15h5"/>',
  drone:
    '<path d="M10 10h4v4h-4zM10 10 6.5 6.5M14 10l3.5-3.5M14 14l3.5 3.5M10 14l-3.5 3.5"/><circle cx="5" cy="5" r="2.5"/><circle cx="19" cy="5" r="2.5"/><circle cx="19" cy="19" r="2.5"/><circle cx="5" cy="19" r="2.5"/>',
  chart: '<path d="M4 20h16"/><rect x="6" y="11" width="3" height="6" rx="1"/><rect x="11" y="7" width="3" height="10" rx="1"/><rect x="16" y="13" width="3" height="4" rx="1"/>',
  building: '<path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01"/>',
  settings:
    '<path d="M10.3 4.3c.4-1.8 3-1.8 3.4 0a1.7 1.7 0 0 0 2.6 1.1c1.5-.9 3.3.8 2.4 2.4a1.7 1.7 0 0 0 1 2.5c1.8.4 1.8 3 0 3.4a1.7 1.7 0 0 0-1 2.6c.9 1.5-.9 3.3-2.4 2.4a1.7 1.7 0 0 0-2.6 1c-.4 1.8-3 1.8-3.4 0a1.7 1.7 0 0 0-2.6-1c-1.5.9-3.3-.9-2.4-2.4a1.7 1.7 0 0 0-1-2.6c-1.8-.4-1.8-3 0-3.4a1.7 1.7 0 0 0 1-2.5c-.9-1.6.9-3.3 2.4-2.4a1.7 1.7 0 0 0 2.6-1.1z"/><circle cx="12" cy="12" r="3"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8"/>',
  bell: '<path fill="currentColor" stroke="none" d="M12 2.5a6.5 6.5 0 0 0-6.5 6.5v3.6L4 15.4c-.4.8.2 1.6 1 1.6h14c.8 0 1.4-.8 1-1.6l-1.5-2.8V9A6.5 6.5 0 0 0 12 2.5zM9.5 18.5a2.5 2.5 0 0 0 5 0z"/>',
  radio: '<circle cx="12" cy="12" r="1.6" fill="currentColor"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  dots: '<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>',
  'dots-vertical': '<circle cx="12" cy="5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="19" r="1.3" fill="currentColor"/>',
  'arrow-up-right': '<rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" stroke="none" opacity=".55"/><path d="M11 13 20 4M13 4h7v7"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.8-4M4 5v4h4M4 13a8 8 0 0 0 14.8 4M20 19v-4h-4"/>',
  'caret-left': '<path fill="currentColor" stroke="none" d="M15 5.5v13a1 1 0 0 1-1.6.8l-7.5-6.5a1 1 0 0 1 0-1.6l7.5-6.5a1 1 0 0 1 1.6.8z"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-right': '<path d="m9 6 6 6-6 6"/>',
  map: '<path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3z"/><path d="M9 4v13M15 7v13"/>',
  cube: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m12 12 8-4.5M12 12v9M12 12 4 7.5"/>',
  maximize: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5M4 4l5 5M20 4l-5 5M4 20l5-5M20 20l-5-5"/>',
  compass: '<circle cx="12" cy="12" r="9" fill="currentColor" stroke="none"/><path d="m15.5 8.5-2 5-5 2 2-5z" fill="#fff" stroke="none"/>',
  filter: '<path fill="currentColor" stroke="none" d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v.8a1.5 1.5 0 0 1-.4 1L14 13.3V19a1 1 0 0 1-1.5.9l-2-1.2a1 1 0 0 1-.5-.9v-4.5L4.4 7.3a1.5 1.5 0 0 1-.4-1z"/>',
  wifi: '<path d="M12 18h.01M9.2 15.2a4 4 0 0 1 5.6 0M6.3 12.3a8 8 0 0 1 11.4 0M3.5 9.5a12 12 0 0 1 17 0"/>',
  package: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m12 12 8-4.5M12 12v9M12 12 4 7.5M16 5.2l-8 4.6"/>',
  'x-circle': '<circle cx="12" cy="12" r="9" fill="currentColor" stroke="none"/><path d="m9.5 9.5 5 5m0-5-5 5" stroke="var(--icon-knockout, #fff)"/>',
  'check-circle': '<circle cx="12" cy="12" r="9" fill="currentColor" stroke="none"/><path d="m8.5 12 2.5 2.5 4.5-5" stroke="var(--icon-knockout, #fff)"/>',
  'alert-circle': '<circle cx="12" cy="12" r="9" fill="currentColor" stroke="none"/><path d="M12 8v4.5M12 16v.01" stroke="var(--icon-knockout, #fff)"/>',
  'alert-triangle': '<path fill="currentColor" stroke="none" d="M10.3 3.9a2 2 0 0 1 3.4 0l8 13.6A2 2 0 0 1 20 20.5H4a2 2 0 0 1-1.7-3z"/><path d="M12 9.5v4M12 17v.01" stroke="#fff"/>',
  calendar: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M16 3v4M8 3v4M4 11h16M8 15h2M14 15h2M8 18h2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  diamond: '<path d="M12 3.5 20.5 12 12 20.5 3.5 12z"/><path d="M12 7.5 16.5 12 12 16.5 7.5 12z" fill="currentColor" stroke="none"/>',
  'diamond-outline': '<path d="M12 3.5 20.5 12 12 20.5 3.5 12z"/>',
  play: '<path fill="currentColor" stroke="none" d="M8 5.5v13a1 1 0 0 0 1.5.9l10.5-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z"/>',
  pause: '<rect x="6.5" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="13.5" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  cloud: '<path d="M7 18a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18 9.5a4 4 0 0 1-.5 8.5z"/>',
  layers: '<path d="m12 4 8 4-8 4-8-4z"/><path d="m4 12 8 4 8-4M4 16l8 4 8-4"/>',
  rotate: '<path d="M4.5 12a7.5 7.5 0 0 1 13-5M19.5 12a7.5 7.5 0 0 1-13 5"/><path d="M17.5 3v4h-4M6.5 21v-4h4"/>',
  crosshair: '<circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  bolt: '<path fill="currentColor" stroke="none" d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z"/>',
  wrench: '<path d="M14.5 6.5a4 4 0 0 0 5.2 5.2L21 13l-8 8-3-3 8-8-1.3-1.3a4 4 0 0 1-5.2-5.2l2.6 2.6 2.2-.4.4-2.2z"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
} as const;

export type IconName = keyof typeof ICONS;

@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'icon', 'aria-hidden': 'true' },
  template: `<svg
    viewBox="0 0 24 24"
    stroke-width="1.7"
    stroke="currentColor"
    fill="none"
    stroke-linecap="round"
    stroke-linejoin="round"
    [innerHTML]="svg()"
  ></svg>`,
  styles: `
    :host.icon {
      display: inline-flex;
      width: 1.25rem;
      height: 1.25rem;
      flex-shrink: 0;
    }
    svg {
      width: 100%;
      height: 100%;
    }
  `,
})
export class IconComponent {
  private readonly sanitizer = inject(DomSanitizer);
  readonly name = input.required<IconName>();
  // Markup comes only from the constant ICONS table above, never from user input.
  protected readonly svg = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(ICONS[this.name()]),
  );
}
