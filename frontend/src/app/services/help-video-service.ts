import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import type { IHelpVideo, IHelpVideoManifest } from '@interfaces/IHelpVideo';
import { normalizeAppPath, resolveHelpVideoByUrl } from '@utils/help-video.util';
import { catchError, of, tap } from 'rxjs';

const MANIFEST_URL = '/help-videos/help-videos.manifest.json';

/** Rotas de fallback quando o manifest local ainda não inclui `route`. */
const ROUTE_BY_FEATURE: Record<string, string> = {
  'auth-login': '/login',
  dashboard: '/dashboard',
  'announcements-board': '/announcements',
  'members-list': '/members',
  'families-list': '/families',
  'families-birthdays': '/families/birthdays',
  'ministries-list': '/ministries',
  'users-list': '/users',
  'roles-catalog': '/roles',
  profile: '/profile',
  'membership-cards': '/membership-cards',
  'ebd-classes': '/ebd',
  'ebd-frequency-report': '/ebd/reports',
  'small-groups-list': '/small-groups',
  'small-groups-frequency-report': '/small-groups/reports',
  'congregation-active': '/congregation',
  'congregations-branches': '/congregations',
  'finance-dashboard': '/finance',
  'finance-entries': '/finance/entries',
  'finance-assets': '/finance/assets',
  'finance-reports': '/finance/reports',
  'secretariat-dashboard': '/secretariat',
  'secretariat-agenda': '/secretariat/agenda',
  'secretariat-visitors': '/secretariat/visitors',
  'secretariat-attendance': '/secretariat/attendance',
  'secretariat-documents': '/secretariat/documents',
  'secretariat-schedules': '/secretariat/schedules',
  'social-projects-list': '/social-projects',
  'missions-assignments': '/missions',
  'constructions-projects': '/constructions',
};

@Injectable({
  providedIn: 'root',
})
export class HelpVideoService {
  readonly #http = inject(HttpClient);

  readonly #videos = signal<IHelpVideo[]>([]);
  readonly #loaded = signal(false);
  readonly #loading = signal(false);

  readonly videos = this.#videos.asReadonly();
  readonly loaded = this.#loaded.asReadonly();

  ensureLoaded(): void {
    if (this.#loaded() || this.#loading()) {
      return;
    }

    this.#loading.set(true);

    this.#http
      .get<IHelpVideoManifest>(MANIFEST_URL)
      .pipe(
        tap(() => undefined),
        catchError(() => of(null)),
      )
      .subscribe((manifest) => {
        const videos = (manifest?.videos ?? []).map((entry) => this.#normalizeEntry(entry));
        this.#videos.set(videos);
        this.#loaded.set(true);
        this.#loading.set(false);
      });
  }

  getByFeatureId(featureId: string): IHelpVideo | null {
    return this.#videos().find((video) => video.featureId === featureId) ?? null;
  }

  resolveByUrl(url: string): IHelpVideo | null {
    return resolveHelpVideoByUrl(normalizeAppPath(url), this.#videos());
  }

  #normalizeEntry(entry: IHelpVideo): IHelpVideo {
    return {
      ...entry,
      route: entry.route || ROUTE_BY_FEATURE[entry.featureId] || '',
    };
  }
}
