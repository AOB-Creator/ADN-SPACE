import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RevealDirective } from '../../shared/reveal.directive';
import { CounterComponent } from '../../shared/counter.component';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RevealDirective, CounterComponent],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { id: 'about', class: 'section' },
})
export class AboutComponent {
  protected readonly i18n = inject(I18nService);
}
