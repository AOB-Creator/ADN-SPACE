import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RevealDirective } from '../../shared/reveal.directive';
import { IconComponent } from '../../shared/icon.component';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-directory',
  standalone: true,
  imports: [RevealDirective, IconComponent],
  templateUrl: './directory.component.html',
  styleUrl: './directory.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'section' },
})
export class DirectoryComponent {
  protected readonly i18n = inject(I18nService);

  protected readonly sheetUrl =
    'https://docs.google.com/spreadsheets/d/13C05zmlQQZLwj3fLzx6XHCy1RQ6FzvF0r_nnRV8pJxQ/edit?usp=sharing';
}
