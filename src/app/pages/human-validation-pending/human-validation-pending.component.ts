import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BankingOptionService } from '../../../services/banking-option.service';
import { StepService, FUNDING_STEPS } from '../../../services/step.service';

@Component({
  selector: 'app-human-validation-pending',
  templateUrl: './human-validation-pending.component.html',
  styleUrl: './human-validation-pending.component.css'
})
export class HumanValidationPendingComponent implements OnInit {
  isChecking: boolean = false;
  errorMessage: string = '';
  validationStatus: 'pending' | 'approved' | 'error' = 'pending';

  constructor(
    private bankingOptionService: BankingOptionService,
    private stepService: StepService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check for banking option on component initialization
    this.checkStatus();
  }

  checkStatus(): void {
    this.isChecking = true;
    this.errorMessage = '';

    this.bankingOptionService.getBankingOption().subscribe({
      next: (response) => {
        this.isChecking = false;

        // Check if we got a BankingOption (admin has set it)
        if (this.bankingOptionService.isBankingOption(response)) {
          console.log('Banking option found:', response);
          this.validationStatus = 'approved';

          // Transition to SELECT_OPTION step
          this.transitionToNextStep();
        } else {
          // Still pending - admin hasn't set banking option yet
          console.log('Banking option not yet available:', response);
          this.validationStatus = 'pending';
        }
      },
      error: (error) => {
        console.error('Error checking banking option:', error);
        this.isChecking = false;
        this.validationStatus = 'error';
        this.errorMessage = 'Failed to check validation status. Please try again.';
      }
    });
  }

  private transitionToNextStep(): void {
    // Transition to SELECT_OPTION step
    this.stepService.transitionTo(FUNDING_STEPS.SELECT_OPTION).subscribe({
      next: () => {
        console.log('Step transitioned to SELECT_OPTION');
        // Navigate to analyse offer page where user can see their options
        this.router.navigate(['/analyseOffer']);
      },
      error: (error) => {
        console.error('Failed to update step:', error);
        // Navigate anyway - banking option is available
        this.router.navigate(['/analyseOffer']);
      }
    });
  }

  // Refresh button handler
  refreshStatus(): void {
    this.checkStatus();
  }
}
