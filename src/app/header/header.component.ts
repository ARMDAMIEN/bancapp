// header.component.ts
import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  currentRoute: string = '';
  isAdmin: boolean = false; // À déterminer selon votre logique d'authentification
  userName: string = '';
  
  // Définition des items de navigation
  navItems = [
    { path: '/admin', label: 'Admin', icon: 'deposit-icon', adminOnly: true }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentRoute = event.url;
    });
    
    this.currentRoute = this.router.url;
    
    this.checkUserRole();
  }

  // Méthode pour vérifier si l'utilisateur est admin
  checkUserRole(): void {

    const userRole = localStorage.getItem('userRole');
    this.isAdmin = userRole === 'ADMIN';
  }

  // Méthode pour déterminer si un item doit être affiché
  shouldShowNavItem(item: any): boolean {
    return !item.adminOnly || (item.adminOnly && this.isAdmin);
  }

  // Méthode pour déterminer si un item est actif
  isActive(path: string): boolean {
    return this.currentRoute === path;
  }

  getUserInitials(): string {
  // Récupérer le nom d'utilisateur depuis votre service d'authentification ou localStorage
  const firstName = localStorage.getItem('firstName') || 'U';
  const lastName = localStorage.getItem('lastName') || '';
  
  // Créer les initiales
  return (firstName.charAt(0) + (lastName ? lastName.charAt(0) : '')).toUpperCase();
}

  // Méthode pour la déconnexion
  logout(): void {
    // Logique de déconnexion - à adapter selon votre implémentation
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    this.router.navigate(['/sign-in']);
  }
}