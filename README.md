# ADN-SPACE

Marketing site for **ADN-SPACE** — a drone technology company from Karakalpakstan,
Uzbekistan. Built with Angular's latest standalone + signals + zoneless model, a
Three.js-powered 3D hero scene, and a dark neon "HUD" design system.

## Stack

- **Angular 20** — standalone components only (no NgModules), signals, the new
  `@if`/`@for`/`@switch` control-flow syntax, and `provideZonelessChangeDetection()`.
- **Three.js** — procedural low-poly drone + starfield rendered in the hero section.
- **SCSS** — CSS custom properties for theming, glassmorphism, and animated gradients.
- IntersectionObserver-driven scroll reveal + a lightweight pointer-tilt directive for
  the card-based "unusual" motion design, no animation framework required.

## Project structure

```
src/
├── app/
│   ├── sections/     one folder per page section (hero, about, applications, …)
│   ├── shared/        reusable directives, icon component, and page copy/content
│   ├── app.ts          root component composing every section
│   └── app.config.ts   application providers (zoneless change detection)
├── styles.scss         design tokens + global styles
└── index.html
public/
├── images/              site imagery (optimized: MP4/WebM for animated assets)
└── favicons/
```

## Commands

| Command           | Action                                        |
| :----------------- | :-------------------------------------------- |
| `npm install`      | Install dependencies                          |
| `npm start`        | Start the dev server at `localhost:4200`      |
| `npm run build`    | Production build to `./dist/adn-space`        |
| `npm run watch`    | Development build in watch mode               |
| `npm test`         | Run unit tests (Karma/Jasmine)                |
