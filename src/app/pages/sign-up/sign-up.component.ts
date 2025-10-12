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
  // STEP 1 - Basic Information
  firstName: string = "";
  lastName: string = "";
  companyName: string = "";
  phoneNumber: string = "";
  email: string = "";
  password: string = "";
  confirmPassword: string = "";
  
  // STEP 2 - Detailed Information
  dateOfBirth: string = "";
  companyCreationDate: string = "";
  companyAddress: string = "";
  einNumber: string = "";
  ssn: string = "";
  
  // UI State
  currentStep: number = 1;
  errorMessage: string = "";

  constructor(
    private authService: AuthService, 
    private errorHandlerService: ErrorHandlerService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.errorMessage = this.errorHandlerService.getErrorMessage();
  }

  // Phone number formatting
  formatPhoneNumber(event: any): void {
    let value = event.target.value.replace(/\D/g, ''); // Remove non-digits
    if (value.length >= 7) {
      value = '(' + value.slice(0, 3) + ') ' + value.slice(3, 6) + '-' + value.slice(6, 10);
    } else if (value.length >= 4) {
      value = '(' + value.slice(0, 3) + ') ' + value.slice(3, 6);
    } else if (value.length >= 1) {
      value = '(' + value.slice(0, 3);
    }
    this.phoneNumber = value;
    event.target.value = value;
  }

  // SSN formatting (auto-add dashes)
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

  // EIN formatting
  formatEIN(event: any): void {
    let value = event.target.value.replace(/\D/g, ''); // Remove non-digits
    if (value.length >= 3) {
      value = value.slice(0, 2) + '-' + value.slice(2, 9);
    }
    this.einNumber = value;
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
      if (this.isStep1Valid() && !this.passwordMismatch()) {
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

  // Validation Step 1
  private isStep1Valid(): boolean {
    return !!(
      this.firstName && 
      this.lastName && 
      this.companyName &&
      this.phoneNumber &&
      this.email && 
      this.password && 
      this.confirmPassword &&
      this.isValidEmail(this.email) &&
      this.isValidPhoneNumber(this.phoneNumber) &&
      this.passwordValidator(this.password)
    );
  }

  // Validation Step 2
  private isStep2Valid(): boolean {
    return !!(
      this.dateOfBirth &&
      this.companyCreationDate &&
      this.companyAddress &&
      this.einNumber &&
      this.ssn &&
      this.isValidAge() &&
      this.isValidEIN(this.einNumber) &&
      this.isValidSSN(this.ssn)
    );
  }

  // Validation de l'email
  private isValidEmail(email: string): boolean {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  }

  // Validation du numéro de téléphone
  private isValidPhoneNumber(phone: string): boolean {
    const phonePattern = /^\(\d{3}\) \d{3}-\d{4}$/;
    return phonePattern.test(phone);
  }

  // Validation du SSN
  private isValidSSN(ssn: string): boolean {
    const ssnPattern = /^[0-9]{3}-[0-9]{2}-[0-9]{4}$/;
    if (!ssnPattern.test(ssn)) {
      return false;
    }

    // Check for suspicious patterns
    return !this.isSuspiciousSSN(ssn);
  }

  // Check for suspicious SSN patterns
  private isSuspiciousSSN(ssn: string): boolean {
    // Remove dashes for pattern checking
    const cleanSSN = ssn.replace(/-/g, '');

    // Pattern 1: All same digits (e.g., 111111111, 999999999)
    const allSameDigit = /^(\d)\1{8}$/.test(cleanSSN);
    if (allSameDigit) {
      return true;
    }

    // Pattern 2: Sequential numbers (e.g., 123456789, 987654321)
    const isSequentialAsc = cleanSSN === '123456789';
    const isSequentialDesc = cleanSSN === '987654321';
    if (isSequentialAsc || isSequentialDesc) {
      return true;
    }

    // Pattern 3: Repeating patterns (e.g., 111222333, 123123123)
    const repeatingPattern = /^(\d{3})\1{2}$/.test(cleanSSN);
    if (repeatingPattern) {
      return true;
    }

    // Pattern 4: Known invalid SSN ranges
    const firstThree = parseInt(cleanSSN.substring(0, 3));
    const middleTwo = parseInt(cleanSSN.substring(3, 5));
    const lastFour = parseInt(cleanSSN.substring(5, 9));

    // Invalid: 000, 666, or 900-999 in first three digits
    if (firstThree === 0 || firstThree === 666 || firstThree >= 900) {
      return true;
    }

    // Invalid: 00 in middle two digits
    if (middleTwo === 0) {
      return true;
    }

    // Invalid: 0000 in last four digits
    if (lastFour === 0) {
      return true;
    }

    return false;
  }

  // Validation de l'EIN
  private isValidEIN(ein: string): boolean {
    const einPattern = /^[0-9]{2}-[0-9]{7}$/;
    return einPattern.test(ein);
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

  // Public method to check if SSN is suspicious (for UI feedback)
  isSSNSuspicious(): boolean {
    if (!this.ssn || this.ssn.length < 11) {
      return false; // Don't show error until SSN is fully entered
    }
    return this.isSuspiciousSSN(this.ssn);
  }

  // Public method to check if SSN has correct format
  hasValidSSNFormat(): boolean {
    const ssnPattern = /^[0-9]{3}-[0-9]{2}-[0-9]{4}$/;
    return ssnPattern.test(this.ssn);
  }

  // Get SSN validation error message
  getSSNErrorMessage(): string {
    const cleanSSN = this.ssn.replace(/-/g, '');

    // Check specific patterns and return appropriate message
    if (/^(\d)\1{8}$/.test(cleanSSN)) {
      return "Invalid SSN: SSN cannot contain all the same digits (e.g., 999-99-9999).";
    }

    if (cleanSSN === '123456789' || cleanSSN === '987654321') {
      return "Invalid SSN: SSN cannot be a sequential number.";
    }

    if (/^(\d{3})\1{2}$/.test(cleanSSN)) {
      return "Invalid SSN: SSN cannot have repeating patterns.";
    }

    const firstThree = parseInt(cleanSSN.substring(0, 3));
    if (firstThree === 0 || firstThree === 666 || firstThree >= 900) {
      return "Invalid SSN: The first three digits are not valid.";
    }

    const middleTwo = parseInt(cleanSSN.substring(3, 5));
    if (middleTwo === 0) {
      return "Invalid SSN: The middle two digits cannot be 00.";
    }

    const lastFour = parseInt(cleanSSN.substring(5, 9));
    if (lastFour === 0) {
      return "Invalid SSN: The last four digits cannot be 0000.";
    }

    return "Please enter a valid SSN format (XXX-XX-XXXX).";
  }

  // Soumission finale du formulaire
  onFinalSubmit(): void {
    // Validation finale
    if (!this.isValidSSN(this.ssn)) {
      this.errorMessage = this.getSSNErrorMessage();
      return;
    }

    if (!this.isStep2Valid()) {
      this.errorMessage = "Please fill in all required fields correctly.";
      return;
    }

    if (!this.passwordValidator(this.password)) {
      this.errorMessage = "Password must contain at least one number, one uppercase letter, one lowercase letter, and one special character.";
      return;
    }

    if (!this.isValidAge()) {
      this.errorMessage = "You must be at least 18 years old to register.";
      return;
    }

    // Préparer les données complètes
    const completeRegistrationData = {
      // Step 1
      firstName: this.firstName,
      lastName: this.lastName,
      companyName: this.companyName,
      phoneNumber: this.phoneNumber,
      email: this.email,
      password: this.password,
      
      // Step 2
      dateOfBirth: this.dateOfBirth,
      companyCreationDate: this.companyCreationDate,
      companyAddress: this.companyAddress,
      einNumber: this.einNumber,
      ssn: this.ssn
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
          }
        });
      },
      error: (error) => {
        console.error('Error on signup: ' + JSON.stringify(error));
        this.errorMessage = error.message || "Registration failed. Please try again.";
      }
    });
  }

  // Social login methods
  signUpWithGoogle(): void {
    this.authService.initiateLogin();
  }

  signUpWithMicrosoft(): void {
    this.authService.initiateLoginMicrosfoft();
  }

  // Méthode pour nettoyer les erreurs
  clearError(): void {
    this.errorMessage = "";
  }
}