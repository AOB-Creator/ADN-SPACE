import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RevealDirective } from '../../shared/reveal.directive';
import { DECREE_ACCENTS } from '../../shared/content';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-decrees',
  standalone: true,
  imports: [RevealDirective],
  templateUrl: './decrees.component.html',
  styleUrl: './decrees.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'section' },
})
export class DecreesComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly accents = DECREE_ACCENTS;
}
