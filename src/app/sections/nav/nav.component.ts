import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { IconComponent } from '../../shared/icon.component';
import { ThemeService } from '../../shared/theme.service';
import { I18nService } from '../../i18n/i18n.service';
import { LOCALES, Locale } from '../../i18n/translations';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly theme = inject(ThemeService);
  protected readonly i18n = inject(I18nService);

  protected readonly scrolled = signal(false);
  protected readonly menuOpen = signal(false);
  protected readonly langMenuOpen = signal(false);

  protected readonly locales = LOCALES;

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

  toggleLangMenu(): void {
    this.langMenuOpen.update((open) => !open);
  }

  selectLocale(locale: Locale): void {
    this.i18n.setLocale(locale);
    this.langMenuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.langMenuOpen() && !this.host.nativeElement.contains(event.target as Node)) {
      this.langMenuOpen.set(false);
    }
  }
}
