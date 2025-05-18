import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  private errorMessage: string='';

  constructor(private router: Router) {}

  setErrorMessage(message: string) {
    this.errorMessage = message;
  }

  getErrorMessage() {
    return this.errorMessage;
  }

  redirectTo(url : string) {
    this.router.navigate([url]);
  }
}
