import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RevealDirective } from '../../shared/reveal.directive';
import { RELEVANCE } from '../../shared/content';

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
  protected readonly sections = RELEVANCE;
  protected readonly activeIndex = signal(0);

  select(index: number): void {
    this.activeIndex.update((current) => (current === index ? -1 : index));
  }
}
