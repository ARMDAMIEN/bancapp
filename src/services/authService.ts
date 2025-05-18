import { Inject, Injectable, PLATFORM_ID, TransferState, makeStateKey } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { isPlatformServer } from "@angular/common";

const TOKEN_KEY = makeStateKey<string>('authToken');

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private http: HttpClient, private transferState : TransferState, @Inject(PLATFORM_ID) private platformId: Object){ }

  login(creditentials: { username: string, password: string }): Observable<any> {
    return this.http.post('http://localhost:8080/loginJWT', creditentials);
  }

  initiateLogin() {
    console.log("test oauth2")
    window.location.href = 'http://localhost:8080/oauth2/redirect?provider=google';
  }

  signUp(signUpData: { email: string; password: string }): Observable<any> {
    console.log('in signUp with : ' + signUpData.email);
    return this.http.post('http://localhost:8080/createUser', signUpData, {responseType : 'json'});
  }

  getAuth(): Observable<any> {
    return this.http.get('http://localhost:8080/getAuthenticated');
  }

  getAuthOauth2(): Observable<any> {
    return this.http.get('http://localhost:8080/getOauth2Token', {
      withCredentials: true
    });
  }

  initiateLoginMicrosfoft() {
    console.log("test oauth2 microsoft")
    window.location.href = 'http://localhost:8080/oauth2/redirect?provider=microsoft';
  }

  forgotPassword(username : string): Observable<any>{
    return this.http.get('http://localhost:8080/forgotPassword?username='+username, {responseType : 'json'});
  }

  changePassword(changeData: { email: string; password: string }): Observable<any> {
    console.log('in changePassword with : ' + changeData.email);
    return this.http.post('http://localhost:8080/changePassword', changeData, {responseType : 'json'});
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