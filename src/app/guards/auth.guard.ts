// src/app/guards/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild {
  
  constructor(private router: Router) {}
  
  canActivate(): boolean {
    return this.checkAuth();
  }
  
  canActivateChild(): boolean {
    return this.checkAuth();
  }
  
  private checkAuth(): boolean {
    // Simple vérification du token dans localStorage
    if (localStorage.getItem('token')) {
      return true;
    }
    
    // Si pas de token, redirection vers la page de connexion
    this.router.navigate(['/sign-in']);
    return false;
  }
}