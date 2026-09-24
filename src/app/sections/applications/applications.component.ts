import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../../shared/reveal.directive';
import { TiltDirective } from '../../shared/tilt.directive';
import { APPLICATIONS } from '../../shared/content';

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
  protected readonly applications = APPLICATIONS;
}
