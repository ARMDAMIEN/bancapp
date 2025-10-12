import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { StepService, FUNDING_STEPS } from '../../../services/step.service';

interface SignatureStatusResponse {
  hasSigned: boolean;
  email: string;
}

@Component({
  selector: 'app-signature-required',
  templateUrl: './signature-required.component.html',
  styleUrl: './signature-required.component.css'
})
export class SignatureRequiredComponent implements OnInit {
  isCheckingStatus: boolean = false;
  private apiUrl = environment.apiUrl;

  constructor(
    private router: Router,
    private http: HttpClient,
    private stepService: StepService
  ) {}

  ngOnInit(): void {
    console.log("on signature required")
    // Load current step from backend first to ensure we have the latest state
    this.stepService.loadFromBackend().subscribe({
      next: () => {
        this.checkSignatureStatus();
      },
      error: (error) => {
        console.error('Failed to load current step:', error);
        // Still check signature status using cached value as fallback
        this.checkSignatureStatus();
      }
    });
  }

  refreshAccountData(): void {
    this.checkSignatureStatus();
  }

  private checkSignatureStatus(): void {
    this.isCheckingStatus = true;

    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No authentication token found');
      this.isCheckingStatus = false;
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.get<SignatureStatusResponse>(
      `${this.apiUrl}/api/signature/status`,
      { headers }
    ).subscribe({
      next: (response) => {
        this.isCheckingStatus = false;

        if (response.hasSigned) {
          console.log('User has signed, transitioning to next step');
          this.transitionAfterSignature();
        }
      },
      error: (error) => {
        console.error('Error checking signature status:', error);
        this.isCheckingStatus = false;
      }
    });
  }

  private transitionAfterSignature(): void {
    // Check current step to determine where to go
    const currentStep = this.stepService.getCurrentStep();

    // Protection: Only transition if we're at SIGNATURE_REQUIRED or before DASHBOARD
    if (currentStep === FUNDING_STEPS.SIGNATURE_REQUIRED ||
        currentStep === FUNDING_STEPS.FUNDING_UNLOCKED) {

      // Transition to FUNDING_UNLOCKED step
      this.stepService.transitionTo(FUNDING_STEPS.FUNDING_UNLOCKED).subscribe({
        next: () => {
          console.log('Step transitioned to FUNDING_UNLOCKED');
          // Navigate to funding unlocked celebration page
          this.router.navigate(['/funding-unlocked']);
        },
        error: (error) => {
          console.error('Failed to update step:', error);
          // Navigate anyway since user has signed
          this.router.navigate(['/funding-unlocked']);
        }
      });
    } else if (currentStep === FUNDING_STEPS.DASHBOARD) {
      // Protection: If already on dashboard, stay there
      console.log('User already on dashboard, staying there');
      this.router.navigate(['/dashboard']);
    } else {
      // Fallback: go to funding-unlocked
      this.router.navigate(['/funding-unlocked']);
    }
  }
}