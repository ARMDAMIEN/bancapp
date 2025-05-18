import { Component } from '@angular/core';
import { AuthService } from '../../services/authService';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {

  username : string = '';
  message : string ='';
  forgotPasswordpForm = FormGroup;

  constructor(private authService : AuthService){

  }

  forgotPassword(){
    this.authService.forgotPassword(this.username).subscribe(
      data => {
        this.message = data.message;
      }, 
      error => {
        this.message = error;
      })
  }
  
}
