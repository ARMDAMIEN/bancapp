import { Component, Inject, OnInit, PLATFORM_ID, TransferState, makeStateKey } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { AuthService } from '../../../services/authService';
import { ErrorHandlerService } from '../../../services/errorHandlerService';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';


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


  constructor(@Inject(PLATFORM_ID) private platformId: Object, private authService: AuthService, private errorHandler: ErrorHandlerService, private transferState: TransferState) {
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

    if (this.authService.getToken()) {
      this.redirectTo("onBoarding");
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
        console.log('is admin ? ' +data.isAdmin);
        if (data.isAdmin) {
          localStorage.setItem('userRole', 'ADMIN');
        }
        this.errorHandler.redirectTo("funding");
      },
      error => {
        console.log('error while login ' + +JSON.stringify(error));
        this.errorMessage = error.error.message;
      }
    )
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

