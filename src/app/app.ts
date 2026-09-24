import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NavComponent } from './sections/nav/nav.component';
import { HeroComponent } from './sections/hero/hero.component';
import { AboutComponent } from './sections/about/about.component';
import { ApplicationsComponent } from './sections/applications/applications.component';
import { PartnersComponent } from './sections/partners/partners.component';
import { DirectoryComponent } from './sections/directory/directory.component';
import { SpecsComponent } from './sections/specs/specs.component';
import { DecreesComponent } from './sections/decrees/decrees.component';
import { FoundersComponent } from './sections/founders/founders.component';
import { RelevanceComponent } from './sections/relevance/relevance.component';
import { ContactComponent } from './sections/contact/contact.component';
import { FooterComponent } from './sections/footer/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    NavComponent,
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
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
