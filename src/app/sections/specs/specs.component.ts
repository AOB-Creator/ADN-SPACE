import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../../shared/reveal.directive';
import { DRONE_SPECS } from '../../shared/content';

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
  protected readonly specs = DRONE_SPECS;
}
