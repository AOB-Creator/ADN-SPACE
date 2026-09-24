import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../../shared/reveal.directive';
import { DECREES } from '../../shared/content';

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
  protected readonly decrees = DECREES;
}
