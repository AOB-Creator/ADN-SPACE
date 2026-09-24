import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RevealDirective } from '../../shared/reveal.directive';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-specs',
  standalone: true,
  imports: [RevealDirective],
  templateUrl: './specs.component.html',
  styleUrl: './specs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { id: 'technology', class: 'section' },
})
export class SpecsComponent {
  protected readonly i18n = inject(I18nService);
}
