import { Injectable, signal } from '@angular/core';

/** Lets a page override the topbar title / show a back button (mobile detail views). */
@Injectable({ providedIn: 'root' })
export class ShellService {
  readonly titleOverride = signal<string | null>(null);
  readonly backLink = signal<string | null>(null);

  set(title: string | null, back: string | null = null) {
    this.titleOverride.set(title);
    this.backLink.set(back);
  }

  reset() {
    this.titleOverride.set(null);
    this.backLink.set(null);
  }
}
