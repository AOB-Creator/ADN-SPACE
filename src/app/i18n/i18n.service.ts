import { Injectable, computed, effect, signal } from '@angular/core';
import { Locale, Translations } from './translations';
import { en } from './en';
import { ru } from './ru';
import { uz } from './uz';
import { kk } from './kk';

const STORAGE_KEY = 'adn-space-locale';
const SUPPORTED: Locale[] = ['uz', 'en', 'ru', 'kk'];
const DICTIONARIES: Record<Locale, Translations> = { uz, en, ru, kk };
/** Internal code 'kk' is Karakalpak; its ISO 639 tag is 'kaa'. */
const HTML_LANG: Record<Locale, string> = { uz: 'uz', en: 'en', ru: 'ru', kk: 'kaa' };

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
  readonly a = computed(() => DICTIONARIES[this.locale()].app);
  readonly locales = SUPPORTED;

  constructor() {
    effect(() => {
      const locale = this.locale();
      document.documentElement.lang = HTML_LANG[locale];
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

  /** Fills {placeholders} in a translated template. */
  f(template: string, params: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? ''));
  }

  /** Seconds since midnight → clock time; 12h for English, 24h elsewhere. */
  time(seconds: number): string {
    const total = Math.floor(((seconds % 86400) + 86400) % 86400);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const mm = String(m).padStart(2, '0');
    if (this.locale() === 'en') {
      const h12 = h % 12 || 12;
      return `${String(h12).padStart(2, '0')}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
    }
    return `${String(h).padStart(2, '0')}:${mm}`;
  }

  /** Seconds → "12 min" or "1 h : 31 m". */
  duration(seconds: number): string {
    const u = this.a().units;
    const mins = Math.max(0, Math.round(seconds / 60));
    if (mins < 60) return `${mins} ${u.min}`;
    return `${Math.floor(mins / 60)} ${u.h} : ${mins % 60} ${u.m}`;
  }

  /** Signed schedule delta, e.g. "+10 min" / "-1 min". */
  delta(seconds: number): string {
    const mins = Math.round(seconds / 60);
    return `${mins > 0 ? '+' : mins < 0 ? '−' : '±'}${Math.abs(mins)} ${this.a().units.min}`;
  }
}
