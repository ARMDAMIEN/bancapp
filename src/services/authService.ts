import { Inject, Injectable, PLATFORM_ID, TransferState, makeStateKey } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { catchError, Observable, throwError } from "rxjs";
import { isPlatformServer } from "@angular/common";
import { environment } from "../environments/environment";

const TOKEN_KEY = makeStateKey<string>('authToken');

export interface SignUpData {
  firstName: string;
  lastName: string;
  ssn: string;
  dateOfBirth: string; // Sera converti en LocalDate côté backend
  email: string;
  password: string;
  companyName: string;
  companyCreationDate: string; // Sera converti en LocalDate côté backend
  einNumber: string;
}

export interface UserResponse {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    ssn: string;
    dateOfBirth: string;
    email: string;
    companyName: string;
    companyCreationDate: string;
    einNumber: string;
    createdAt: string;
    updatedAt: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = environment.apiUrl;

  

  constructor(private http: HttpClient, private transferState: TransferState, @Inject(PLATFORM_ID) private platformId: Object) { }

  login(creditentials: { username: string, password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/loginJWT`, creditentials);
  }

  initiateLogin() {
    window.location.href = `${this.apiUrl}/oauth2/redirect?provider=google`;
  }

  // Inscription utilisateur
  signUp(signUpData: SignUpData): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.apiUrl}/createUser`, signUpData)
      .pipe(
        catchError(this.handleError)
      );
  }

  getAuth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/getAuthenticated`);
  }

  getAuthOauth2(): Observable<any> {
    return this.http.get(`${this.apiUrl}/getOauth2Token`, {
      withCredentials: true
    });
  }

  initiateLoginMicrosfoft() {
    window.location.href = `${this.apiUrl}/oauth2/redirect?provider=microsoft`;
  }

  forgotPassword(username: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/forgotPassword?username=${username}`, {responseType: 'json'});
  }

  changePassword(changeData: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/changePassword`, changeData, {responseType: 'json'});
  }

  getToken(): string | null {
    return this.transferState.get(TOKEN_KEY, null);
  }

  setToken(token: string): void {
    if (isPlatformServer(this.platformId)) {
      this.transferState.set(TOKEN_KEY, token);
    }
  }

  // Gestion des erreurs
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = error.error.message;
    } else {
      // Erreur côté serveur
      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else {
        switch (error.status) {
          case 400:
            errorMessage = 'Invalid data provided';
            break;
          case 409:
            errorMessage = 'Email or SSN already exists';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later';
            break;
          default:
            errorMessage = `Error: ${error.message}`;
        }
      }
    }
    
    return throwError(() => ({ message: errorMessage }));
  }
}