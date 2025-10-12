import { Component, Inject, OnInit, PLATFORM_ID, TransferState, makeStateKey } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { AuthService } from '../../../services/authService';
import { ErrorHandlerService } from '../../../services/errorHandlerService';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { StepService, FUNDING_STEPS } from '../../../services/step.service';


@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.css'
})
export class SignInComponent implements OnInit {

  signInForm: FormGroup;
  errorMessage: string = '';
  username: string = "";
  password: string = "";


  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private authService: AuthService,
    private errorHandler: ErrorHandlerService,
    private transferState: TransferState,
    private stepService: StepService
  ) {
    this.signInForm = new FormGroup({
      signInMail: new FormControl(''),
      signInPass: new FormControl('')
    })
  }
  ngOnInit(): void {

    if (isPlatformServer(this.platformId)) {
      console.log('Running on the server');
    } else if (isPlatformBrowser(this.platformId)) {
      console.log('Running in the browser');
    }

    // If user is already logged in, redirect based on their step
    if (this.authService.getToken()) {
      this.stepService.loadFromBackend().subscribe({
        next: (state) => {
          this.redirectBasedOnStep(state.currentStep);
        },
        error: (err) => {
          console.error('Failed to load step:', err);
          // Fallback redirect if can't load step
          this.redirectTo("dashboard");
        }
      });
    }

  }

  performLogin(username: string, password: string) {
    const signInData = {
      username: username,
      password: password
    }

    this.authService.login(signInData).subscribe(
      data => {
        localStorage.setItem('token', data.accessToken);

        // Load user's step from backend and redirect accordingly
        this.stepService.loadFromBackend().subscribe({
          next: (state) => {
            console.log('User current step:', state.currentStep);
            this.redirectBasedOnStep(state.currentStep);
          },
          error: (err) => {
            console.error('Failed to load step:', err);
            // Fallback to dashboard if step loading fails
            this.errorHandler.redirectTo("dashboard");
          }
        });
      },
      error => {
        console.log('error while login ' + JSON.stringify(error));
        this.errorMessage = error.error.message;
      }
    )
  }

  private redirectBasedOnStep(currentStep: string) {
    switch (currentStep) {
      case FUNDING_STEPS.FUNDING_INFO:
        this.errorHandler.redirectTo("funding");
        break;
      case FUNDING_STEPS.AI_CALCULATING:
        this.errorHandler.redirectTo("analyseOffer");
        break;
      case FUNDING_STEPS.HUMAN_VALIDATION_PENDING:
        this.errorHandler.redirectTo("human-validation-pending");
        break;
      case FUNDING_STEPS.SELECT_OPTION:
        this.errorHandler.redirectTo("analyseOffer");
        break;
      case FUNDING_STEPS.DOCUMENTS_SUPP:
        this.errorHandler.redirectTo("documentSupp");
        break;
      case FUNDING_STEPS.SIGNATURE_REQUIRED:
        this.errorHandler.redirectTo("signature-required");
        break;
      case FUNDING_STEPS.FUNDING_UNLOCKED:
        this.errorHandler.redirectTo("funding-unlocked");
        break;
      case FUNDING_STEPS.DASHBOARD:
        this.errorHandler.redirectTo("dashboard");
        break;
      default:
        // Default to funding if unknown step
        this.errorHandler.redirectTo("funding");
    }
  }

  redirectTo(url: string) {
    this.errorHandler.redirectTo(url);
  }

  signUpWithGoogle() {
    this.authService.initiateLogin();
  }

  signUpWithMicrosoft() {
    this.authService.initiateLoginMicrosfoft();
  }
}

