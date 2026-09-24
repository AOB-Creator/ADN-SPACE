import { Injectable, computed, effect, signal } from '@angular/core';
import { Locale, Translations } from './translations';
import { en } from './en';
import { ru } from './ru';
import { uz } from './uz';
import { kk } from './kk';

const STORAGE_KEY = 'adn-space-locale';
const SUPPORTED: Locale[] = ['uz', 'en', 'ru', 'kk'];
const DICTIONARIES: Record<Locale, Translations> = { uz, en, ru, kk };

function readInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'uz';

  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored && SUPPORTED.includes(stored)) return stored;

  const browserLang = navigator.language?.slice(0, 2).toLowerCase();
  if (browserLang && SUPPORTED.includes(browserLang as Locale)) {
    return browserLang as Locale;
  }

  return 'uz';
}

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly locale = signal<Locale>(readInitialLocale());
  readonly t = computed(() => DICTIONARIES[this.locale()]);
  readonly locales = SUPPORTED;

  constructor() {
    effect(() => {
      const locale = this.locale();
      document.documentElement.lang = locale;
      try {
        localStorage.setItem(STORAGE_KEY, locale);
      } catch {
        /* private-mode storage can throw; locale still applies for this session */
      }
    });
  }

  setLocale(locale: Locale): void {
    this.locale.set(locale);
  }
}
