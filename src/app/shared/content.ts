export interface Application {
  icon: string;
  title: string;
  description: string;
}

export const APPLICATIONS: Application[] = [
  {
    icon: '🚒',
    title: 'Firefighting & Emergency Response',
    description: 'Rapid aerial situational awareness and thermal detection for first responders.',
  },
  {
    icon: '🌱',
    title: 'Smart Agriculture',
    description: 'NDVI crop health mapping, precision spraying, and irrigation analysis.',
  },
  {
    icon: '🏙️',
    title: 'Urban Infrastructure & Smart Cities',
    description: '3D city modeling, traffic monitoring, and public-space utilization studies.',
  },
  {
    icon: '🚓',
    title: 'Public Safety',
    description: 'Real-time surveillance and rapid-deployment reconnaissance for security teams.',
  },
  {
    icon: '🌍',
    title: 'Geophysical Analysis',
    description: 'Terrain, land, and resource surveying across remote and difficult terrain.',
  },
  {
    icon: '📦',
    title: 'Aerial Logistics & Delivery',
    description: 'Lightweight cargo delivery pilots for hard-to-reach and time-critical routes.',
  },
];

export interface Partner {
  name: string;
  detail: string;
}

export const PARTNERS: Partner[] = [
  {
    name: 'EHang Inc.',
    detail: 'Pioneers in autonomous aerial vehicles and passenger drones.',
  },
  {
    name: 'Highgreat Technology Co., Ltd.',
    detail: 'Experts in drone swarms and intelligent formations.',
  },
  {
    name: 'Shenzhen DAMODA Intelligent Control Technology Co., Ltd.',
    detail: 'Leaders in precision control systems and industrial drone applications.',
  },
];

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

export interface DroneSpec {
  model: string;
  specs: string;
}

export const DRONE_SPECS: DroneSpec[] = [
  {
    model: 'Falcon ADN 300 RTK',
    specs: '55‑min flight, 15 km range, RTK GPS, ARM dual‑core, 2 GB RAM, DJI SDK, ROS support',
  },
  {
    model: 'Falcon ADN X2',
    specs: '4K navigation cams, 360° obstacle avoidance, Jetson TX2, 8 GB RAM, Python API',
  },
  {
    model: 'Parrot Anafi AI',
    specs: '4G drone, 48 MP camera, Qualcomm QRB5165, 6 GB RAM, MAVLink, AirSDK',
  },
];

export interface Decree {
  title: string;
  date: string;
  description: string;
  accent: 'cyan' | 'violet' | 'magenta' | 'amber';
}

export const DECREES: Decree[] = [
  {
    title: 'Tax Incentives for High‑Tech Manufacturing',
    date: 'January 22, 2025',
    description:
      'A presidential decree introduced tax benefits for domestic manufacturers of advanced technologies including drones, microchips, and batteries to boost local high‑tech production.',
    accent: 'cyan',
  },
  {
    title: 'Establishment of Uzbekcosmos',
    date: 'August 30, 2019',
    description:
      'Uzbekcosmos, the national space agency, was created to develop UAV and aerospace technologies as part of national innovation strategies.',
    accent: 'violet',
  },
  {
    title: 'Domestic UAV Production — Lochin',
    date: 'Ongoing',
    description:
      'The government has launched domestic production of drones under the "Lochin" brand, used for reconnaissance, defense, and national surveillance operations.',
    accent: 'amber',
  },
  {
    title: 'International Partnership with Malaysia',
    date: 'September 2024',
    description:
      "In collaboration with Malaysia's Meraque Group, Uzbekistan is setting up local drone manufacturing to support agriculture and technological employment.",
    accent: 'magenta',
  },
];

export interface Founder {
  name: string;
  role: string;
  image: string;
}

export const FOUNDERS: Founder[] = [
  { name: 'Alpamis Omirbekov', role: 'CEO & Co‑Founder', image: 'Alpamis.jpg' },
  { name: 'Niyetulla Abdullaev', role: 'CTO & Co‑Founder', image: 'NIKO.jpg' },
];

export interface RelevanceSection {
  icon: string;
  title: string;
  intro: string;
  points: string[];
}

export const RELEVANCE: RelevanceSection[] = [
  {
    icon: '✈️',
    title: 'Agricultural Modernization',
    intro:
      "Agriculture accounts for ~25% of Uzbekistan's GDP and employs about 27% of the workforce. Drones can:",
    points: [
      'Monitor crop health with NDVI and thermal imaging.',
      'Optimize pesticide and fertilizer application.',
      'Perform efficient land mapping and irrigation analysis.',
    ],
  },
  {
    icon: '🛡️',
    title: 'Border and Security Surveillance',
    intro:
      'Uzbekistan shares long and sometimes remote borders with Afghanistan, Kazakhstan, and other neighbors.',
    points: [
      'Monitor borders in real-time.',
      'Support military reconnaissance.',
      'Enhance disaster response in hard-to-reach areas.',
    ],
  },
  {
    icon: '🌇',
    title: 'Urban Planning and Smart Cities',
    intro: 'Cities like Tashkent and Samarkand are undergoing digital transformation and expansion.',
    points: [
      'Assist in 3D modeling of cities.',
      'Track traffic and pollution.',
      'Help in public space utilization analysis.',
    ],
  },
  {
    icon: '🛍️',
    title: 'Commercial & Entertainment Applications',
    intro: 'Growing interest in tourism, tech events, and e‑commerce.',
    points: [
      'Provide drone shows for tourism & festivals.',
      'Deliver lightweight goods (pilot projects).',
      'Create content for media and marketing.',
    ],
  },
  {
    icon: '🌍',
    title: 'Strategic Perspective',
    intro: 'A long-term outlook for Uzbekistan on the regional and global stage.',
    points: [
      'Regional Leadership: Uzbekistan can become a drone tech hub in Central Asia.',
      'Youth and Innovation: stimulates education, engineering, and tech entrepreneurship.',
      'Export Potential: local drone products could be exported to neighbors (Kyrgyzstan, Tajikistan, Turkmenistan, etc.)',
    ],
  },
];

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
