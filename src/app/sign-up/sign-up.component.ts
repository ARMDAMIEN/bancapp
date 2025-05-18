import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/authService';
import { ErrorHandlerService } from '../../services/errorHandlerService';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrl: './sign-up.component.css'
})
export class SignUpComponent implements OnInit {
  username: string = "";
  password: string = "";
  confirmPassword: string = "";
  errorMessage: string = "";
  signUpPassForm: FormGroup;

  constructor(private authService: AuthService, private errorHandlerService: ErrorHandlerService,
    private router: Router) {
    this.signUpPassForm = new FormGroup({
      signUpEmail: new FormControl('', [Validators.required, Validators.email])
    })
  }
  ngOnInit(): void {
    this.errorMessage = this.errorHandlerService.getErrorMessage();
  }

  passwordValidator(password: string) {
    if (!password) {
      return false;
    }
    console.log('password :' + password)
    const hasNumber = /\d/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>_-]/.test(password);

    const valid = hasNumber && hasUpper && hasLower && hasSpecial;
    if (!valid) {
      return true;
    }
    return false;
  }

  onSignUp(username: string, password: string) {
    if (!this.passwordValidator(password)) {
      const signUpData = {
        email: username,
        password: password
      };

      this.authService.signUp(signUpData).subscribe({
        next: (data) => {
          const credentials = {
            username: signUpData.email,
            password: signUpData.password
          };
          this.authService.login(credentials).subscribe(
            data => {
              localStorage.setItem('token', data.accessToken);
              this.router.navigate(['/deposits']);
            },
            error => {
              console.log('error while login ' + +JSON.stringify(error));
              this.errorMessage = error;
            })
        },
        error: (error) => {
          console.error('error on signup : ' + JSON.stringify(error));
          this.errorMessage = "Unknown error";
        }
      });
    } else {
      this.errorMessage = "Password must contain at least one number, one uppercase letter, one lowercase letter, and one special character.";
    }
  }

  redirectTo(url: string) {
    this.errorHandlerService.redirectTo(url);
  }

  signUpWithGoogle() {
    this.authService.initiateLogin();
  }

  signUpWithMicrosoft() {
    this.authService.initiateLoginMicrosfoft();
  }

  passwordMismatch() {
    if (this.password !== this.confirmPassword) {
      return true;
    }
    return false;
  }
}


