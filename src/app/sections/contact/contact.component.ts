import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../../shared/reveal.directive';
import { IconComponent } from '../../shared/icon.component';
import { SOCIAL_LINKS } from '../../shared/content';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [RevealDirective, IconComponent],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { id: 'contact', class: 'section' },
})
export class ContactComponent {
  protected readonly links = SOCIAL_LINKS;
}
