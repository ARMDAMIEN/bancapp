import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/authService';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.css'
})
export class ChangePasswordComponent implements OnInit {

  username: string = '';
  password: string = '';
  message : string = '';
  changePassForm: FormGroup;

  constructor(private route: ActivatedRoute, private authService: AuthService) {
    this.changePassForm = new FormGroup({
      confirmPass: new FormControl('', [Validators.required]),
      changePass: new FormControl('', [Validators.required, this.passwordValidator])
    }, { validators: this.confirmPasswordValidator })
  }

  confirmPasswordValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    if (!(control && control instanceof FormGroup)) {
      return null;
    }
    const formGroup = control as FormGroup;
    const confirmPassword = formGroup.get('confirmPass')?.value;
    const password = formGroup.get('changePass')?.value;
    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  }

  passwordValidator(control: FormControl): { [key: string]: any } | null {
    const password = control.value;
    if (!password) {
      return null;
    }
    console.log('password :'+password)
    const hasNumber = /\d/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>_-]/.test(password);

    const valid = hasNumber && hasUpper && hasLower && hasSpecial;
    if (!valid) {
      return { strong: true };
    }
    return null;
  }



  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.username = params['username'];
      console.log(this.username);
    });;
  }

  changePassword() {
    if (this?.changePassForm.valid) {
      const changeData = {
        email: this.username,
        password: this?.changePassForm?.get('changePass')?.value
      }

      this.authService.changePassword(changeData).subscribe(
        data => {
          console.log("sucessfully change password with : "+data.message);
          this.message = data.message;        },
        error => {  
          console.log("error while changing password"+ error.error.message);
          this.message = error.error.message;
        }
      )
    } else {
      this?.changePassForm.markAsTouched();
    }
  }
}
