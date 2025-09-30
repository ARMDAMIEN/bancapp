// src/app/guards/signature-guard.service.ts
import { Injectable } from '@angular/core';
import { 
  CanActivate, 
  ActivatedRouteSnapshot, 
  RouterStateSnapshot, 
  Router,
  UrlTree 
} from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../environments/environment';

interface SignatureStatusResponse {
  hasSigned: boolean;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class SignatureGuardService implements CanActivate {
  private apiUrl = environment.apiUrl;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.warn('No token found, redirecting to sign-in');
      return of(this.router.createUrlTree(['/sign-in']));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.get<SignatureStatusResponse>(
      `${this.apiUrl}/api/signature/status`, 
      { headers }
    ).pipe(
      map(response => {
        const hasSigned = response.hasSigned;
        const targetUrl = state.url;

        // Si l'utilisateur n'a pas signé
        if (!hasSigned) {
          // Si on essaie d'accéder au dashboard ou funding-unlocked
          if (targetUrl.includes('dashboard') || targetUrl.includes('funding-unlocked')) {
            return this.router.createUrlTree(['/signature-required']);
          }
          // Si on est déjà sur signature-required, laisser passer
          return true;
        }

        // Si l'utilisateur a signé
        const hasSeenFundingUnlocked = localStorage.getItem('hasSeenFundingUnlocked') === 'true';

        // Si c'est sa première visite après signature
        if (!hasSeenFundingUnlocked) {
          // Si on essaie d'accéder au dashboard, rediriger vers funding-unlocked
          if (targetUrl.includes('dashboard')) {
            return this.router.createUrlTree(['/funding-unlocked']);
          }
          // Laisser accéder à funding-unlocked
          return true;
        }

        // Utilisateur signé et a déjà vu funding-unlocked
        // Si on essaie d'accéder à signature-required, rediriger vers dashboard
        if (targetUrl.includes('signature-required')) {
          return this.router.createUrlTree(['/dashboard']);
        }

        return true;
      }),
      catchError(error => {
        console.error('Error checking signature:', error);
        // En cas d'erreur, rediriger vers signature-required par sécurité
        return of(this.router.createUrlTree(['/signature-required']));
      })
    );
  }
}