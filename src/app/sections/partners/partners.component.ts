import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RevealDirective } from '../../shared/reveal.directive';
import { PARTNER_LOGOS } from '../../shared/content';
import { I18nService } from '../../i18n/i18n.service';

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
  protected readonly i18n = inject(I18nService);
  protected readonly marqueeLogos = [...PARTNER_LOGOS, ...PARTNER_LOGOS];
}
