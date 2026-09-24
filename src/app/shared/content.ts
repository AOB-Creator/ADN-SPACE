// Structural, locale-independent data that pairs up with the translated
// copy in `src/app/i18n/*` by array index (image paths, accent colors,
// external links — nothing here needs translating).

export const PARTNER_LOGOS = [
  'partner1.png',
  'partner2.png',
  'partner3.png',
  'partner4.png',
  'partner5.png',
  'partner6.png',
  'partner8.png',
  'partner9.png',
];

/** Matches the order of `decrees.items` in each locale file. */
export const DECREE_ACCENTS: ('cyan' | 'violet' | 'magenta' | 'amber')[] = [
  'cyan',
  'violet',
  'amber',
  'magenta',
];

/** Matches the order of `founders.items` in each locale file. */
export const FOUNDER_IMAGES = ['Alpamis.jpg', 'NIKO.jpg'];

export interface SocialLink {
  label: string;
  href: string;
  icon: 'mail' | 'github' | 'behance' | 'threads' | 'dribbble' | 'x' | 'linkedin' | 'facebook';
}

export const SOCIAL_LINKS: SocialLink[] = [
  { label: 'Email', href: 'mailto:business.alpamis@gmail.com', icon: 'mail' },
  { label: 'GitHub', href: 'https://github.com/AOB-Creator', icon: 'github' },
  { label: 'Behance', href: '#', icon: 'behance' },
  { label: 'Threads', href: '#', icon: 'threads' },
  { label: 'Dribbble', href: '#', icon: 'dribbble' },
  { label: 'X', href: '#', icon: 'x' },
  { label: 'LinkedIn', href: '#', icon: 'linkedin' },
  { label: 'Facebook', href: '#', icon: 'facebook' },
];
