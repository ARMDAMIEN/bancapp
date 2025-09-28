import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/authService';
import { ErrorHandlerService } from '../../../services/errorHandlerService';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrl: './sign-up.component.css'
})
export class SignUpComponent implements OnInit {
  // Step 1 - Personal Information (Template-driven form)
  firstName: string = "";
  lastName: string = "";
  ssn: string = "";
  dateOfBirth: string = "";
  email: string = "";
  password: string = "";
  confirmPassword: string = "";
  
  // UI State
  currentStep: number = 1;
  errorMessage: string = "";
  
  // Forms (gardé pour compatibilité si nécessaire)
  personalInfoForm: FormGroup;
  businessInfoForm: FormGroup;

  constructor(
    private authService: AuthService, 
    private errorHandlerService: ErrorHandlerService,
    private router: Router
  ) {
    // Garder les FormGroup pour une éventuelle migration future
    this.personalInfoForm = new FormGroup({
      firstName: new FormControl('', [Validators.required]),
      lastName: new FormControl('', [Validators.required]),
      ssn: new FormControl('', [Validators.required, Validators.pattern(/^[0-9]{3}-[0-9]{2}-[0-9]{4}$/)]),
      dateOfBirth: new FormControl('', [Validators.required]),
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required, Validators.minLength(8)]),
      confirmPassword: new FormControl('', [Validators.required])
    });

    this.businessInfoForm = new FormGroup({
      companyName: new FormControl('', [Validators.required]),
      companyCreationDate: new FormControl('', [Validators.required]),
      einNumber: new FormControl('', [Validators.required, Validators.pattern(/^[0-9]{2}-[0-9]{7}$/)])
    });
  }

  ngOnInit(): void {
    this.errorMessage = this.errorHandlerService.getErrorMessage();
    this.setupSSNFormatting();
  }

  // SSN formatting (auto-add dashes)
  setupSSNFormatting(): void {
    // Cette méthode peut être appelée depuis le template avec (input)="formatSSN($event)"
  }

  formatSSN(event: any): void {
    let value = event.target.value.replace(/\D/g, ''); // Remove non-digits
    if (value.length >= 6) {
      value = value.slice(0, 3) + '-' + value.slice(3, 5) + '-' + value.slice(5, 9);
    } else if (value.length >= 3) {
      value = value.slice(0, 3) + '-' + value.slice(3, 5);
    }
    this.ssn = value;
    event.target.value = value;
  }

  // Password validation
  passwordValidator(password: string): boolean {
    if (!password) {
      return false;
    }
    
    const hasNumber = /\d/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>_-]/.test(password);
    const hasMinLength = password.length >= 8;

    return hasNumber && hasUpper && hasLower && hasSpecial && hasMinLength;
  }

  // Password mismatch check
  passwordMismatch(): boolean {
    return this.password !== this.confirmPassword && this.confirmPassword !== "";
  }

  // Step navigation
  nextStep(): void {
    if (this.currentStep === 1) {
      // Validation avant de passer à l'étape 2
      if (this.isPersonalInfoValidForTemplate() && !this.passwordMismatch()) {
        this.currentStep = 2;
        this.errorMessage = "";
      } else {
        this.errorMessage = "Please fill in all required fields correctly.";
      }
    }
  }

  previousStep(): void {
    if (this.currentStep === 2) {
      this.currentStep = 1;
      this.errorMessage = "";
    }
  }

  goToLogin(): void {
    this.router.navigate(['/sign-in']);
  }

  // Validation pour le template-driven form de l'étape 1
  private isPersonalInfoValidForTemplate(): boolean {
    return !!(
      this.firstName && 
      this.lastName && 
      this.ssn && 
      this.dateOfBirth && 
      this.email && 
      this.password && 
      this.confirmPassword &&
      this.isValidAge() &&
      this.isValidEmail(this.email) &&
      this.isValidSSN(this.ssn) &&
      this.passwordValidator(this.password)
    );
  }

  // Validation de l'email
  private isValidEmail(email: string): boolean {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  }

  // Validation du SSN
  private isValidSSN(ssn: string): boolean {
    const ssnPattern = /^[0-9]{3}-[0-9]{2}-[0-9]{4}$/;
    return ssnPattern.test(ssn);
  }

  // Gestion de la soumission finale du formulaire complet (appelée par BusinessInfoComponent)
  onFinalSubmit(businessData: any): void {
    // Validation finale avant soumission
    if (!this.passwordValidator(this.password)) {
      this.errorMessage = "Password must contain at least one number, one uppercase letter, one lowercase letter, and one special character.";
      this.onBusinessFormError(this.errorMessage);
      return;
    }

    if (!this.isValidAge()) {
      this.errorMessage = "You must be at least 18 years old to register.";
      this.onBusinessFormError(this.errorMessage);
      return;
    }

    // Combiner les données des deux étapes
    const completeRegistrationData = {
      // Données personnelles (étape 1)
      firstName: this.firstName,
      lastName: this.lastName,
      ssn: this.ssn,
      dateOfBirth: this.dateOfBirth,
      email: this.email,
      password: this.password,
      
      // Données business (étape 2) - mapper les noms de propriétés
      companyName: businessData.businessName,
      companyCreationDate: businessData.foundingDate,
      einNumber: businessData.ein
    };

    console.log('Données complètes d\'inscription:', completeRegistrationData);
    
    // Appeler le service d'inscription
    this.authService.signUp(completeRegistrationData).subscribe({
      next: (data) => {
        // Auto-login après inscription réussie
        const credentials = {
          username: completeRegistrationData.email,
          password: completeRegistrationData.password
        };
        
        this.authService.login(credentials).subscribe({
          next: (loginData) => {
            localStorage.setItem('token', loginData.accessToken);
            this.router.navigate(['/funding']);
          },
          error: (error) => {
            console.log('Error while login: ' + JSON.stringify(error));
            this.errorMessage = "Login failed after registration. Please try logging in manually.";
            this.onBusinessFormError(this.errorMessage);
          }
        });
      },
      error: (error) => {
        console.error('Error on signup: ' + JSON.stringify(error));
        this.errorMessage = error.message || "Registration failed. Please try again.";
        this.onBusinessFormError(this.errorMessage);
      }
    });
  }

  // Méthode pour gérer les erreurs du BusinessInfoComponent
  onBusinessFormError(error: string): void {
    this.errorMessage = error;
  }

  // Social login methods
  signUpWithGoogle(): void {
    this.authService.initiateLogin();
  }

  signUpWithMicrosoft(): void {
    this.authService.initiateLoginMicrosfoft();
  }

  // Legacy method support (for backward compatibility)
  redirectTo(url: string): void {
    this.errorHandlerService.redirectTo(url);
  }

  // Form validation helpers (gardés pour compatibilité)
  isPersonalInfoValid(): boolean {
    return this.personalInfoForm.valid && !this.passwordMismatch();
  }

  isBusinessInfoValid(): boolean {
    return this.businessInfoForm.valid;
  }

  // Age validation (must be 18+)
  isValidAge(): boolean {
    if (!this.dateOfBirth) return false;
    
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= 18;
    }
    
    return age >= 18;
  }

  // Méthode pour nettoyer les erreurs
  clearError(): void {
    this.errorMessage = "";
  }

  // Méthode legacy pour l'ancienne logique (si nécessaire)
  onSignUp(): void {
    // Cette méthode est maintenant gérée par onFinalSubmit()
    // Gardée pour compatibilité
    console.warn('onSignUp() is deprecated, use onFinalSubmit() instead');
  }
}