import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';
import { HeroComponent } from '../../sections/hero/hero.component';
import { AboutComponent } from '../../sections/about/about.component';
import { ApplicationsComponent } from '../../sections/applications/applications.component';
import { PartnersComponent } from '../../sections/partners/partners.component';
import { DirectoryComponent } from '../../sections/directory/directory.component';
import { SpecsComponent } from '../../sections/specs/specs.component';
import { DecreesComponent } from '../../sections/decrees/decrees.component';
import { FoundersComponent } from '../../sections/founders/founders.component';
import { RelevanceComponent } from '../../sections/relevance/relevance.component';
import { ContactComponent } from '../../sections/contact/contact.component';
import { FooterComponent } from '../../sections/footer/footer.component';

@Component({
  selector: 'app-company-page',
  standalone: true,
  imports: [
    RouterLink,
    HeroComponent,
    AboutComponent,
    ApplicationsComponent,
    PartnersComponent,
    DirectoryComponent,
    SpecsComponent,
    DecreesComponent,
    FoundersComponent,
    RelevanceComponent,
    ContactComponent,
    FooterComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="chips" aria-label="ADN-SPACE">
      @for (link of links; track link.id) {
        <a routerLink="/company" [fragment]="link.id">{{ i18n.t().nav.links[link.key] }}</a>
      }
    </nav>
    <div class="sections">
      <app-hero />
      <app-about />
      <app-applications />
      <app-partners />
      <app-directory />
      <app-specs />
      <app-decrees />
      <app-founders />
      <app-relevance />
      <app-contact />
    </div>
    <app-footer />
  `,
  styles: `
    :host {
      display: block;
      padding-left: 92px;
    }
    .chips {
      position: sticky;
      top: 88px;
      z-index: 20;
      display: flex;
      gap: 0.4rem;
      width: min(1240px, 100% - 3rem);
      margin: 88px auto 0;
      padding: 0.35rem;
      overflow-x: auto;
      border-radius: 14px;
      background: color-mix(in srgb, var(--bg-elevated) 85%, transparent);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border-soft);
      box-shadow: var(--shadow-xs);
      scrollbar-width: none;
    }
    .chips a {
      padding: 0.45rem 0.85rem;
      border-radius: 10px;
      font-size: 0.82rem;
      color: var(--text-mid);
      white-space: nowrap;
      transition: background 0.2s, color 0.2s;
    }
    .chips a:hover {
      background: var(--bg-raise);
      color: var(--text-hi);
    }
    .sections > *:nth-child(even) {
      background: linear-gradient(180deg, transparent, var(--stripe) 20%, var(--stripe) 80%, transparent);
    }
    @media (max-width: 899px) {
      :host {
        padding-left: 0;
      }
      .chips {
        top: 72px;
        margin-top: 0.5rem;
      }
    }
  `,
})
export class CompanyPage {
  protected readonly i18n = inject(I18nService);
  protected readonly links = [
    { id: 'about', key: 'about' as const },
    { id: 'applications', key: 'applications' as const },
    { id: 'partners', key: 'partners' as const },
    { id: 'technology', key: 'technology' as const },
    { id: 'founders', key: 'founders' as const },
    { id: 'contact', key: 'contact' as const },
  ];
}
