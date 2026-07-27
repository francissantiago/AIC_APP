import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SetupService } from '@services/setup-service';
import { map } from 'rxjs';

/** Redireciona o fluxo de login para `/setup` enquanto a instalação não tiver usuários. */
export const setupCompletedGuard: CanActivateFn = () => {
  const setupService = inject(SetupService);
  const router = inject(Router);

  return setupService
    .ensureStatus()
    .pipe(map((needsSetup) => (needsSetup ? router.createUrlTree(['/setup']) : true)));
};
