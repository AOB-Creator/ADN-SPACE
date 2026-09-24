import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RevealDirective } from '../../shared/reveal.directive';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-relevance',
  standalone: true,
  imports: [RevealDirective],
  templateUrl: './relevance.component.html',
  styleUrl: './relevance.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'section' },
})
export class RelevanceComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly activeIndex = signal(0);

  select(index: number): void {
    this.activeIndex.update((current) => (current === index ? -1 : index));
  }
}
