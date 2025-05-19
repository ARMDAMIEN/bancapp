import { Inject, Injectable, PLATFORM_ID, TransferState, makeStateKey } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { isPlatformServer } from "@angular/common";
import { environment } from "../environment/environment-prod";

const TOKEN_KEY = makeStateKey<string>('authToken');

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

  signUp(signUpData: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/createUser`, signUpData, {responseType: 'json'});
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
}