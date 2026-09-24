import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../../shared/reveal.directive';
import { PARTNERS, PARTNER_LOGOS } from '../../shared/content';

@Component({
  selector: 'app-partners',
  standalone: true,
  imports: [RevealDirective],
  templateUrl: './partners.component.html',
  styleUrl: './partners.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { id: 'partners', class: 'section' },
})
export class PartnersComponent {
  protected readonly partners = PARTNERS;
  protected readonly logos = PARTNER_LOGOS;
  protected readonly marqueeLogos = [...PARTNER_LOGOS, ...PARTNER_LOGOS];
}
