import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../environments/environment';

// Define step constants
export const FUNDING_STEPS = {
  FUNDING_INFO: 'funding_info',
  AI_CALCULATING: 'ai_calculating',
  HUMAN_VALIDATION_PENDING: 'human_validation_pending',
  SELECT_OPTION: 'select_option',
  DOCUMENTS_SUPP: 'documents_supp',
  SIGNATURE_REQUIRED: 'signature_required',
  FUNDING_UNLOCKED: 'funding_unlocked',
  DASHBOARD: 'dashboard'
} as const;

export const DASHBOARD_SUBSTEPS = {
  WITHDRAWAL_AVAILABLE: 'withdrawal_available',
  PAYMENT_PENDING: 'payment_pending',
  WITHDRAWAL_PENDING: 'withdrawal_pending',
  SUSPENDED: 'suspended'
} as const;

// Type definitions
export type FundingStep = typeof FUNDING_STEPS[keyof typeof FUNDING_STEPS];
export type DashboardSubstep = typeof DASHBOARD_SUBSTEPS[keyof typeof DASHBOARD_SUBSTEPS];

export interface StepState {
  currentStep: FundingStep;
  currentSubstep?: DashboardSubstep;
  previousStep?: FundingStep;
  history: FundingStep[];
  timestamp: Date;
}

// Transition rules
const validTransitions: Record<FundingStep, FundingStep[]> = {
  [FUNDING_STEPS.FUNDING_INFO]: [FUNDING_STEPS.AI_CALCULATING],
  [FUNDING_STEPS.AI_CALCULATING]: [FUNDING_STEPS.HUMAN_VALIDATION_PENDING],
  [FUNDING_STEPS.HUMAN_VALIDATION_PENDING]: [FUNDING_STEPS.SELECT_OPTION],
  [FUNDING_STEPS.SELECT_OPTION]: [FUNDING_STEPS.DOCUMENTS_SUPP],
  [FUNDING_STEPS.DOCUMENTS_SUPP]: [FUNDING_STEPS.SIGNATURE_REQUIRED],
  [FUNDING_STEPS.SIGNATURE_REQUIRED]: [FUNDING_STEPS.FUNDING_UNLOCKED],
  [FUNDING_STEPS.FUNDING_UNLOCKED]: [FUNDING_STEPS.DASHBOARD],
  [FUNDING_STEPS.DASHBOARD]: [FUNDING_STEPS.DASHBOARD]
};

@Injectable({
  providedIn: 'root'
})
export class StepService {
  private readonly STORAGE_KEY = 'funding_step_state';
  private readonly API_URL = `${environment.apiUrl}/api/steps`;

  private stepStateSubject: BehaviorSubject<StepState>;
  public stepState$: Observable<StepState>;
  private isSyncing = false;

  constructor(private http: HttpClient) {
    // Initialize from localStorage first (for immediate UI)
    const cachedState = this.loadState();
    const initialState = cachedState || this.createInitialState();
    this.stepStateSubject = new BehaviorSubject<StepState>(initialState);
    this.stepState$ = this.stepStateSubject.asObservable();
  }

  /**
   * Load step from backend and sync with local state
   * Call this on app initialization or after login
   */
  loadFromBackend(): Observable<StepState> {
    return this.http.get<{ currentStep: string; currentSubstep?: string }>(`${this.API_URL}/current`)
      .pipe(
        map(response => {
          const state: StepState = {
            currentStep: response.currentStep as FundingStep,
            currentSubstep: response.currentSubstep as DashboardSubstep | undefined,
            previousStep: this.stepStateSubject.value.currentStep,
            history: this.buildHistory(response.currentStep as FundingStep),
            timestamp: new Date()
          };
          return state;
        }),
        tap(state => {
          this.stepStateSubject.next(state);
          this.saveState(state);
        }),
        catchError(error => {
          console.error('Failed to load step from backend:', error);
          // Keep using cached state on error
          return throwError(() => error);
        })
      );
  }

  /**
   * Get the current step state
   */
  getCurrentState(): StepState {
    return this.stepStateSubject.value;
  }

  /**
   * Get the current step
   */
  getCurrentStep(): FundingStep {
    return this.stepStateSubject.value.currentStep;
  }

  /**
   * Get the current substep (if on dashboard)
   */
  getCurrentSubstep(): DashboardSubstep | undefined {
    return this.stepStateSubject.value.currentSubstep;
  }

  /**
   * Transition to a new step with validation and backend sync
   */
  transitionTo(targetStep: FundingStep, substep?: DashboardSubstep): Observable<boolean> {
    const currentState = this.stepStateSubject.value;
    const currentStep = currentState.currentStep;

    // Validate transition
    if (!this.isValidTransition(currentStep, targetStep)) {
      console.error(`Invalid transition from ${currentStep} to ${targetStep}`);
      return throwError(() => new Error(`Invalid transition from ${currentStep} to ${targetStep}`));
    }

    // Update backend first
    return this.http.post<{ success: boolean; currentStep: string }>(
      `${this.API_URL}/transition`,
      { targetStep }
    ).pipe(
      tap(() => {
        // Update local state on success
        const newState: StepState = {
          currentStep: targetStep,
          currentSubstep: targetStep === FUNDING_STEPS.DASHBOARD ? substep : undefined,
          previousStep: currentStep,
          history: [...currentState.history, targetStep],
          timestamp: new Date()
        };
        this.stepStateSubject.next(newState);
        this.saveState(newState);
      }),
      map(() => true),
      catchError(error => {
        console.error('Failed to transition step on backend:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Transition to a new step locally only (without backend sync)
   * Use this for offline mode or when backend is not available
   */
  transitionToLocal(targetStep: FundingStep, substep?: DashboardSubstep): boolean {
    const currentState = this.stepStateSubject.value;
    const currentStep = currentState.currentStep;

    // Validate transition
    if (!this.isValidTransition(currentStep, targetStep)) {
      console.error(`Invalid transition from ${currentStep} to ${targetStep}`);
      return false;
    }

    // Create new state
    const newState: StepState = {
      currentStep: targetStep,
      currentSubstep: targetStep === FUNDING_STEPS.DASHBOARD ? substep : undefined,
      previousStep: currentStep,
      history: [...currentState.history, targetStep],
      timestamp: new Date()
    };

    // Update state
    this.stepStateSubject.next(newState);
    this.saveState(newState);

    return true;
  }

  /**
   * Update dashboard substep with backend sync (only valid when on dashboard)
   */
  updateSubstep(substep: DashboardSubstep): Observable<boolean> {
    const currentState = this.stepStateSubject.value;

    if (currentState.currentStep !== FUNDING_STEPS.DASHBOARD) {
      console.error('Cannot update substep when not on dashboard');
      return throwError(() => new Error('Cannot update substep when not on dashboard'));
    }

    // Update backend first
    return this.http.post<{ success: boolean; currentSubstep: string }>(
      `${this.API_URL}/substep`,
      { substep }
    ).pipe(
      tap(() => {
        // Update local state on success
        const newState: StepState = {
          ...currentState,
          currentSubstep: substep,
          timestamp: new Date()
        };
        this.stepStateSubject.next(newState);
        this.saveState(newState);
      }),
      map(() => true),
      catchError(error => {
        console.error('Failed to update substep on backend:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update dashboard substep locally only (without backend sync)
   */
  updateSubstepLocal(substep: DashboardSubstep): boolean {
    const currentState = this.stepStateSubject.value;

    if (currentState.currentStep !== FUNDING_STEPS.DASHBOARD) {
      console.error('Cannot update substep when not on dashboard');
      return false;
    }

    const newState: StepState = {
      ...currentState,
      currentSubstep: substep,
      timestamp: new Date()
    };

    this.stepStateSubject.next(newState);
    this.saveState(newState);

    return true;
  }

  /**
   * Check if a transition is valid
   */
  isValidTransition(fromStep: FundingStep, toStep: FundingStep): boolean {
    const allowedTransitions = validTransitions[fromStep];
    return allowedTransitions?.includes(toStep) ?? false;
  }

  /**
   * Get all valid next steps from current position
   */
  getNextSteps(): FundingStep[] {
    return validTransitions[this.getCurrentStep()] || [];
  }

  /**
   * Check if currently on a specific step
   */
  isOnStep(step: FundingStep): boolean {
    return this.getCurrentStep() === step;
  }

  /**
   * Check if currently on a specific substep
   */
  isOnSubstep(substep: DashboardSubstep): boolean {
    return this.getCurrentSubstep() === substep;
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    const initialState = this.createInitialState();
    this.stepStateSubject.next(initialState);
    this.saveState(initialState);
  }

  /**
   * Get step history
   */
  getHistory(): FundingStep[] {
    return [...this.stepStateSubject.value.history];
  }

  /**
   * Check if a step has been visited
   */
  hasVisited(step: FundingStep): boolean {
    return this.stepStateSubject.value.history.includes(step);
  }

  /**
   * Get step progress (0-100)
   */
  getProgress(): number {
    const allSteps = Object.values(FUNDING_STEPS);
    const currentIndex = allSteps.indexOf(this.getCurrentStep());
    return Math.round((currentIndex / (allSteps.length - 1)) * 100);
  }

  /**
   * Clear stored state
   */
  clearState(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.reset();
  }

  // Private helper methods

  private createInitialState(): StepState {
    return {
      currentStep: FUNDING_STEPS.FUNDING_INFO,
      currentSubstep: undefined,
      previousStep: undefined,
      history: [FUNDING_STEPS.FUNDING_INFO],
      timestamp: new Date()
    };
  }

  /**
   * Build history array based on current step
   * Assumes user went through all steps sequentially
   */
  private buildHistory(currentStep: FundingStep): FundingStep[] {
    const allSteps = Object.values(FUNDING_STEPS);
    const currentIndex = allSteps.indexOf(currentStep);

    if (currentIndex === -1) {
      return [FUNDING_STEPS.FUNDING_INFO];
    }

    // Return all steps up to and including current step
    return allSteps.slice(0, currentIndex + 1);
  }

  private saveState(state: StepState): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save step state:', error);
    }
  }

  private loadState(): StepState | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const state = JSON.parse(stored);
      // Convert timestamp string back to Date
      state.timestamp = new Date(state.timestamp);

      return state;
    } catch (error) {
      console.error('Failed to load step state:', error);
      return null;
    }
  }
}
