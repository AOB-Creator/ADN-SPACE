import { ChangeDetectionStrategy, Component, HostListener, signal } from '@angular/core';

interface NavLink {
  label: string;
  href: string;
}

@Component({
  selector: 'app-nav',
  standalone: true,
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavComponent {
  protected readonly scrolled = signal(false);
  protected readonly menuOpen = signal(false);

  protected readonly links: NavLink[] = [
    { label: 'About', href: '#about' },
    { label: 'Applications', href: '#applications' },
    { label: 'Partners', href: '#partners' },
    { label: 'Technology', href: '#technology' },
    { label: 'Founders', href: '#founders' },
    { label: 'Contact', href: '#contact' },
  ];

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 24);
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
