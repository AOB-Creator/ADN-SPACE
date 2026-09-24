import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RevealDirective } from '../../shared/reveal.directive';
import { TiltDirective } from '../../shared/tilt.directive';
import { FOUNDER_IMAGES } from '../../shared/content';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-founders',
  standalone: true,
  imports: [RevealDirective, TiltDirective],
  templateUrl: './founders.component.html',
  styleUrl: './founders.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { id: 'founders', class: 'section' },
})
export class FoundersComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly images = FOUNDER_IMAGES;
}
