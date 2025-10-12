// src/app/guards/signature-guard.service.ts
import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
  UrlTree
} from '@angular/router';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { StepService, FUNDING_STEPS } from '../../services/step.service';

@Injectable({
  providedIn: 'root'
})
export class SignatureGuardService implements CanActivate {

  constructor(
    private router: Router,
    private stepService: StepService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {

    const token = localStorage.getItem('token');

    if (!token) {
      console.warn('No token found, redirecting to sign-in');
      return of(this.router.createUrlTree(['/sign-in']));
    }

    const targetUrl = state.url;

    // Load current step from backend first to ensure we have the latest state
    return this.stepService.loadFromBackend().pipe(
      map(() => {
        const currentStep = this.stepService.getCurrentStep();

        // Route protection based on current step
        // Users can only access routes at or before their current step

        // If trying to access signature-required
        if (targetUrl.includes('signature-required')) {
          // Only allow if user is at DOCUMENTS_SUPP or SIGNATURE_REQUIRED
          if (currentStep === FUNDING_STEPS.DOCUMENTS_SUPP ||
              currentStep === FUNDING_STEPS.SIGNATURE_REQUIRED) {
            return true;
          }

          // If user is past signature (at FUNDING_UNLOCKED or DASHBOARD), redirect to their current step
          if (currentStep === FUNDING_STEPS.FUNDING_UNLOCKED) {
            return this.router.createUrlTree(['/funding-unlocked']);
          }
          if (currentStep === FUNDING_STEPS.DASHBOARD) {
            return this.router.createUrlTree(['/dashboard']);
          }

          // If user hasn't reached signature yet, redirect to their current step
          return this.router.createUrlTree([this.getRouteForStep(currentStep)]);
        }

        // If trying to access funding-unlocked
        if (targetUrl.includes('funding-unlocked')) {
          // Only allow if user is at SIGNATURE_REQUIRED or FUNDING_UNLOCKED
          if (currentStep === FUNDING_STEPS.SIGNATURE_REQUIRED ||
              currentStep === FUNDING_STEPS.FUNDING_UNLOCKED) {
            return true;
          }

          // If user is at DASHBOARD, allow them to go back to funding-unlocked
          if (currentStep === FUNDING_STEPS.DASHBOARD) {
            return true;
          }

          // If user hasn't reached this step yet, redirect to their current step
          return this.router.createUrlTree([this.getRouteForStep(currentStep)]);
        }

        // If trying to access dashboard
        if (targetUrl.includes('dashboard')) {
          // Only allow if user is at FUNDING_UNLOCKED or DASHBOARD
          if (currentStep === FUNDING_STEPS.FUNDING_UNLOCKED ||
              currentStep === FUNDING_STEPS.DASHBOARD) {
            return true;
          }

          // If user hasn't reached this step yet, redirect to their current step
          return this.router.createUrlTree([this.getRouteForStep(currentStep)]);
        }

        // For all other routes, allow access
        return true;
      }),
      catchError(error => {
        console.error('Error in signature guard:', error);
        // On error, use cached step value as fallback
        const currentStep = this.stepService.getCurrentStep();
        return of(this.router.createUrlTree([this.getRouteForStep(currentStep)]));
      })
    );
  }

  private getRouteForStep(step: string): string {
    const stepRoutes: Record<string, string> = {
      [FUNDING_STEPS.FUNDING_INFO]: '/funding',
      [FUNDING_STEPS.AI_CALCULATING]: '/ai-calculating',
      [FUNDING_STEPS.HUMAN_VALIDATION_PENDING]: '/human-validation-pending',
      [FUNDING_STEPS.SELECT_OPTION]: '/analyseOffer',
      [FUNDING_STEPS.DOCUMENTS_SUPP]: '/documentSupp',
      [FUNDING_STEPS.SIGNATURE_REQUIRED]: '/signature-required',
      [FUNDING_STEPS.FUNDING_UNLOCKED]: '/funding-unlocked',
      [FUNDING_STEPS.DASHBOARD]: '/dashboard'
    };

    return stepRoutes[step] || '/funding';
  }
}
