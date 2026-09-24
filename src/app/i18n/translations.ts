export type Locale = 'uz' | 'en' | 'ru' | 'kk';

export interface LocaleOption {
  code: Locale;
  label: string;
}

export const LOCALES: LocaleOption[] = [
  { code: 'uz', label: 'UZ' },
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
  { code: 'kk', label: 'QQ' },
];

export interface TextIcon {
  icon: string;
  title: string;
  description: string;
}

export interface NamedDetail {
  name: string;
  detail: string;
}

export interface SpecRow {
  model: string;
  specs: string;
}

export interface DecreeItem {
  title: string;
  date: string;
  description: string;
}

export interface FounderCopy {
  name: string;
  role: string;
}

export interface RelevanceItem {
  icon: string;
  title: string;
  intro: string;
  points: string[];
}

export interface Translations {
  meta: {
    title: string;
    description: string;
  };
  nav: {
    links: {
      about: string;
      applications: string;
      partners: string;
      technology: string;
      founders: string;
      contact: string;
    };
    cta: string;
    skipToContent: string;
  };
  hero: {
    eyebrow: string;
    titleLine1: string;
    titleLine2: string;
    lede: string;
    ctaPrimary: string;
    ctaSecondary: string;
    stats: {
      founded: string;
      maxRange: string;
      flightTime: string;
      partners: string;
    };
  };
  about: {
    eyebrow: string;
    titleStart: string;
    titleHighlight: string;
    ledeHtml: string;
    paragraphHtml: string;
    facts: { label: string; value: string }[];
    stats: { value: string; suffix: string; label: string }[];
  };
  applications: {
    eyebrow: string;
    titleStart: string;
    titleHighlight: string;
    items: TextIcon[];
  };
  partners: {
    eyebrow: string;
    titleStart: string;
    titleHighlight: string;
    titleEnd: string;
    lede: string;
    items: NamedDetail[];
    note: string;
    marqueeLabel: string;
  };
  directory: {
    eyebrow: string;
    titleStart: string;
    titleHighlight: string;
    titleEnd: string;
    description: string;
    categories: string[];
    cta: string;
  };
  specs: {
    eyebrow: string;
    titleStart: string;
    titleHighlight: string;
    description: string;
    tableTitle: string;
    tableHeaders: { model: string; specs: string };
    items: SpecRow[];
  };
  decrees: {
    eyebrow: string;
    titleStart: string;
    titleHighlight: string;
    items: DecreeItem[];
    visionEyebrow: string;
    visionTitle: string;
    visionText: string;
  };
  founders: {
    eyebrow: string;
    titleStart: string;
    titleHighlight: string;
    items: FounderCopy[];
  };
  relevance: {
    eyebrow: string;
    titleStart: string;
    titleHighlight: string;
    intro: string;
    sections: RelevanceItem[];
  };
  contact: {
    eyebrow: string;
    titleStart: string;
    titleHighlight: string;
    description: string;
    emailCta: string;
  };
  footer: {
    rights: string;
    by: string;
  };
  theme: {
    toggleToLight: string;
    toggleToDark: string;
  };
  language: {
    label: string;
  };
}
