import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../../shared/reveal.directive';
import { CounterComponent } from '../../shared/counter.component';

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
  protected readonly facts = [
    { label: 'Established', value: '2024' },
    { label: 'Headquarters', value: 'Karakalpakstan, Republic of Uzbekistan' },
    { label: 'Research center', value: 'ADN‑SPACE Laboratory' },
    { label: 'Co‑founded by', value: 'University students' },
  ];
}
