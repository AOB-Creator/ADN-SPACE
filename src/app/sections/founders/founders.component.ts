import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../../shared/reveal.directive';
import { TiltDirective } from '../../shared/tilt.directive';
import { FOUNDERS } from '../../shared/content';

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
  protected readonly founders = FOUNDERS;
}
