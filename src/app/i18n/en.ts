import { Translations } from './translations';

export const en: Translations = {
  meta: {
    title: 'ADN-SPACE — Innovative Drone Technologies from Karakalpakstan',
    description:
      'ADN-SPACE is a pioneering drone technology company from Karakalpakstan, Uzbekistan, designing and manufacturing UAVs for agriculture, public safety, infrastructure, and aerial logistics.',
  },
  nav: {
    links: {
      about: 'About',
      applications: 'Applications',
      partners: 'Partners',
      technology: 'Technology',
      founders: 'Founders',
      contact: 'Contact',
    },
    cta: 'Contact us',
    skipToContent: 'Skip to content',
  },
  hero: {
    eyebrow: 'ADN‑SPACE · Karakalpakstan, Uzbekistan',
    titleLine1: 'Engineering the',
    titleLine2: 'future of flight.',
    lede: 'A drone technology company born from student ambition — designing, building and customizing next‑generation UAVs for agriculture, public safety, smart cities and aerial logistics across Uzbekistan and beyond.',
    ctaPrimary: 'Explore the technology',
    ctaSecondary: 'Get in touch',
    stats: {
      founded: 'Founded',
      maxRange: 'Max range',
      flightTime: 'Flight time',
      partners: 'Global partners',
    },
  },
  about: {
    eyebrow: 'About ADN‑SPACE',
    titleStart: 'A pioneering drone company,',
    titleHighlight: 'born from student ambition.',
    ledeHtml:
      'ADN‑SPACE is a pioneering drone technology company born in the heart of Karakalpakstan, inspired by <strong>President Shavkat Mirziyoyev\'s</strong> vision of building a New Uzbekistan led by innovation, youth, and technology.',
    paragraphHtml:
      'Founded in 2024 by a team of passionate students, ADN‑SPACE designs, manufactures, and customizes drones tailored for high‑impact sectors — from firefighting and agriculture to smart cities and aerial logistics. Backed by our research center, ADN‑SPACE LABORATORY, we push the boundaries of Unmanned Aerial Systems (UAS) and automation, aligned with the "Uzbekistan – 2030" strategy for digital transformation and youth entrepreneurship.',
    facts: [
      { label: 'Established', value: '2024' },
      { label: 'Headquarters', value: 'Karakalpakstan, Republic of Uzbekistan' },
      { label: 'Research center', value: 'ADN‑SPACE Laboratory' },
      { label: 'Co‑founded by', value: 'University students' },
    ],
    stats: [
      { value: '2024', suffix: '', label: 'Year founded' },
      { value: '15', suffix: ' km', label: 'Maximum flight range' },
      { value: '55', suffix: ' min', label: 'Peak flight endurance' },
      { value: '6', suffix: '+', label: 'Industries served' },
    ],
  },
  applications: {
    eyebrow: 'Drone applications',
    titleStart: 'One airframe platform,',
    titleHighlight: 'six mission profiles.',
    items: [
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
    ],
  },
  partners: {
    eyebrow: 'Global cooperation',
    titleStart: 'Bringing',
    titleHighlight: 'world‑class expertise',
    titleEnd: 'into Uzbekistan.',
    lede: 'ADN‑SPACE has established active business partnerships with leading Chinese drone manufacturers, bringing high‑performance technology into Uzbekistan — adapted to the needs of our environment and economy.',
    items: [
      { name: 'EHang Inc.', detail: 'Pioneers in autonomous aerial vehicles and passenger drones.' },
      {
        name: 'Highgreat Technology Co., Ltd.',
        detail: 'Experts in drone swarms and intelligent formations.',
      },
      {
        name: 'Shenzhen DAMODA Intelligent Control Technology Co., Ltd.',
        detail: 'Leaders in precision control systems and industrial drone applications.',
      },
    ],
    note: '🤝 These collaborations bring world‑class expertise and high‑performance technology into Uzbekistan, adapted to the needs of our environment and economy.',
    marqueeLabel: 'Business partnerships & companies willing to work with us',
  },
  directory: {
    eyebrow: 'Directory',
    titleStart: 'Explore the best',
    titleHighlight: 'drone companies',
    titleEnd: 'for your needs.',
    description:
      "Looking for reliable drone service providers? Whether you're planning a breathtaking drone light show, need aerial photography, or require drone mapping and inspection services — we've compiled a curated directory with services, pricing, and contact information for each company.",
    categories: [
      '🎆 Drone Light Shows',
      '📸 Aerial Photography & Videography',
      '🌍 3D Mapping & Surveying',
      '🏗️ Industrial Inspection',
      '🚁 Custom Drone Development',
    ],
    cta: 'Open drone companies list',
  },
  specs: {
    eyebrow: 'Drone hardware & software',
    titleStart: 'Inside the drone:',
    titleHighlight: 'specs, components & code.',
    description:
      "Drones are complex aerial systems that combine advanced hardware, software, and firmware to achieve flight, autonomy, data capture, and synchronization. Here's a breakdown of the core components of modern drones — from mechanical parts to processors and coding frameworks.",
    tableTitle: 'Drone models & technical specifications',
    tableHeaders: { model: 'Drone model', specs: 'Specs & tech summary' },
    items: [
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
    ],
  },
  decrees: {
    eyebrow: 'National policy',
    titleStart: 'Presidential decrees',
    titleHighlight: 'powering the drone industry.',
    items: [
      {
        title: 'Tax Incentives for High‑Tech Manufacturing',
        date: 'January 22, 2025',
        description:
          'A presidential decree introduced tax benefits for domestic manufacturers of advanced technologies including drones, microchips, and batteries to boost local high‑tech production.',
      },
      {
        title: 'Establishment of Uzbekcosmos',
        date: 'August 30, 2019',
        description:
          'Uzbekcosmos, the national space agency, was created to develop UAV and aerospace technologies as part of national innovation strategies.',
      },
      {
        title: 'Domestic UAV Production — Lochin',
        date: 'Ongoing',
        description:
          'The government has launched domestic production of drones under the "Lochin" brand, used for reconnaissance, defense, and national surveillance operations.',
      },
      {
        title: 'International Partnership with Malaysia',
        date: 'September 2024',
        description:
          "In collaboration with Malaysia's Meraque Group, Uzbekistan is setting up local drone manufacturing to support agriculture and technological employment.",
      },
    ],
    visionEyebrow: 'Strategic vision',
    visionTitle: '"Uzbekistan – 2030"',
    visionText:
      "These decrees are part of Uzbekistan's broader strategy to become a Central Asian leader in drone and aerospace innovation. President Mirziyoyev's vision focuses on integrating UAVs in agriculture, defense, logistics, and smart city systems — while nurturing local talent and international cooperation.",
  },
  founders: {
    eyebrow: 'The team',
    titleStart: 'Founders of',
    titleHighlight: 'ADN‑SPACE & ADN‑SPACE Lab.',
    items: [
      { name: 'Alpamis Omirbekov', role: 'CEO & Co‑Founder' },
      { name: 'Niyetulla Abdullaev', role: 'CTO & Co‑Founder' },
    ],
  },
  relevance: {
    eyebrow: 'Why it matters',
    titleStart: 'The relevance of drone',
    titleHighlight: 'development in Uzbekistan.',
    intro:
      "From agricultural modernization to border security and smart cities — UAV technology touches nearly every strategic priority on Uzbekistan's national agenda.",
    sections: [
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
    ],
  },
  contact: {
    eyebrow: "Let's build the future",
    titleStart: 'Ready to bring your',
    titleHighlight: 'drone mission to life?',
    description:
      "Whether you're exploring a partnership, need a custom UAV platform, or want to talk about the future of Central Asia's drone ecosystem — we'd love to hear from you.",
    emailCta: 'business.alpamis@gmail.com',
  },
  footer: {
    rights: 'ADN‑SPACE Laboratory · Karakalpakstan, Republic of Uzbekistan',
    by: 'Engineered by ADN‑SPACE researchers',
  },
  theme: {
    toggleToLight: 'Switch to light mode',
    toggleToDark: 'Switch to dark mode',
  },
  language: {
    label: 'Language',
  },
};
