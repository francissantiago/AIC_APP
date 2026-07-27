import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SetupService } from '@services/setup-service';
import { map } from 'rxjs';

/** Libera `/setup` apenas enquanto a instalação não tiver usuários. */
export const setupRequiredGuard: CanActivateFn = () => {
  const setupService = inject(SetupService);
  const router = inject(Router);

  return setupService
    .ensureStatus()
    .pipe(map((needsSetup) => (needsSetup ? true : router.createUrlTree(['/login']))));
};
