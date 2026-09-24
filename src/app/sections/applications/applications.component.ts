import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RevealDirective } from '../../shared/reveal.directive';
import { TiltDirective } from '../../shared/tilt.directive';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-applications',
  standalone: true,
  imports: [RevealDirective, TiltDirective],
  templateUrl: './applications.component.html',
  styleUrl: './applications.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { id: 'applications', class: 'section' },
})
export class ApplicationsComponent {
  protected readonly i18n = inject(I18nService);
}
