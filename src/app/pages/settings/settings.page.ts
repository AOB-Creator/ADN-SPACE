import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';
import { ThemeService } from '../../shared/theme.service';
import { FleetSimService } from '../../core/sim/fleet-sim.service';
import { LOCALES } from '../../i18n/translations';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [IconComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let t = i18n.a();
    <div class="wrap">
      <section class="panel group">
        <h2 class="group__title"><app-icon name="sun" />{{ t.settings.appearance }}</h2>
        <div class="row">
          <span>{{ t.settings.theme }}</span>
          <div class="seg">
            <button type="button" [class.on]="theme.theme() === 'light'" (click)="theme.theme.set('light')"><app-icon name="sun" />{{ t.settings.light }}</button>
            <button type="button" [class.on]="theme.theme() === 'dark'" (click)="theme.theme.set('dark')"><app-icon name="moon" />{{ t.settings.dark }}</button>
          </div>
        </div>
        <div class="row">
          <span>{{ t.settings.language }}</span>
          <div class="seg">
            @for (l of locales; track l.code) {
              <button type="button" [class.on]="i18n.locale() === l.code" (click)="i18n.setLocale(l.code)">{{ l.label }}</button>
            }
          </div>
        </div>
      </section>

      <section class="panel group">
        <h2 class="group__title"><app-icon name="radio" />{{ t.settings.simulation }}</h2>
        <div class="row">
          <span>
            {{ t.settings.live }}
            <small>{{ t.settings.liveHint }}</small>
          </span>
          <button type="button" class="switch" [class.switch--on]="sim.running()" (click)="sim.setRunning(!sim.running())" role="switch" [attr.aria-checked]="sim.running()" [attr.aria-label]="t.settings.live"></button>
        </div>
        <div class="row">
          <span>{{ t.settings.speed }}</span>
          <div class="seg">
            @for (s of speeds; track s) {
              <button type="button" [class.on]="sim.speed() === s" (click)="sim.setSpeed(s)">{{ s }}×</button>
            }
          </div>
        </div>
      </section>

      <section class="panel group about">
        <h2 class="group__title"><app-icon name="sparkle" />{{ t.settings.about }}</h2>
        <p>{{ t.settings.aboutBody }}</p>
        <a class="btn-sm" routerLink="/company"><app-icon name="building" />{{ t.nav.company }}</a>
      </section>
    </div>
  `,
  styles: `
    :host {
      display: block;
      padding: calc(var(--top-h) + 4px) 24px 32px var(--side-offset);
    }
    .wrap {
      display: grid;
      gap: 14px;
      max-width: 760px;
    }
    .group {
      padding: 0.5rem 1.2rem 1rem;
    }
    .group__title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.8rem 0 0.4rem;
      font-size: 0.95rem;
      app-icon {
        width: 18px;
        height: 18px;
        color: var(--accent);
      }
    }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.8rem;
      padding: 0.8rem 0;
      border-top: 1px solid var(--border-soft);
      font-size: 0.88rem;
      font-weight: 500;
      small {
        display: block;
        font-weight: 400;
        font-size: 0.76rem;
        color: var(--text-lo);
      }
    }
    .switch {
      position: relative;
      width: 44px;
      height: 26px;
      flex-shrink: 0;
      border: 0;
      border-radius: 999px;
      background: var(--border-strong);
      cursor: pointer;
      transition: background 0.2s;
      &::after {
        content: '';
        position: absolute;
        left: 3px;
        top: 3px;
        width: 20px;
        height: 20px;
        border-radius: 999px;
        background: #fff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
        transition: transform 0.25s var(--ease-spring);
      }
    }
    .switch--on {
      background: var(--accent);
      &::after {
        transform: translateX(18px);
      }
    }
    .about p {
      font-size: 0.88rem;
      line-height: 1.6;
      margin-bottom: 1rem;
    }
    @media (max-width: 899px) {
      :host {
        padding: 4px 16px 16px;
      }
    }
  `,
})
export class SettingsPage {
  protected readonly i18n = inject(I18nService);
  protected readonly theme = inject(ThemeService);
  protected readonly sim = inject(FleetSimService);
  protected readonly locales = LOCALES;
  protected readonly speeds = [1, 3, 6, 12, 24];
}
