// header.component.ts
import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { filter } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  currentRoute: string = '';
  isAdmin: boolean = false; // À déterminer selon votre logique d'authentification
  userName: string = '';
  showDropdown: boolean = false;

  // Définition des items de navigation
  navItems = [
    { path: '/admin', label: 'Admin', icon: 'deposit-icon', adminOnly: true }
  ];

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentRoute = event.url;
    });

    this.currentRoute = this.router.url;

    this.checkUserRole();
    this.loadUserName();

    // Close dropdown when clicking outside
    document.addEventListener('click', (event: any) => {
      const target = event.target;
      const dropdown = document.querySelector('.user-menu-container');
      if (dropdown && !dropdown.contains(target)) {
        this.showDropdown = false;
      }
    });
  }

  // Load user name from backend
  loadUserName(): void {
    this.http.get<{ firstName: string, lastName: string }>(`${environment.apiUrl}/users/name`)
      .subscribe({
        next: (response) => {
          localStorage.setItem('firstName', response.firstName);
          localStorage.setItem('lastName', response.lastName);
          this.userName = `${response.firstName} ${response.lastName}`;
        },
        error: (error) => {
          console.error('Error loading user name:', error);
          // Fallback to localStorage if API call fails
          const firstName = localStorage.getItem('firstName') || '';
          const lastName = localStorage.getItem('lastName') || '';
          this.userName = `${firstName} ${lastName}`.trim();
        }
      });
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

  // Méthode pour basculer le dropdown
  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }

  // Méthode pour naviguer vers le profil
  goToProfile(): void {
    this.showDropdown = false;
    this.router.navigate(['/profile']);
  }

  // Méthode pour naviguer vers le dashboard
  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  // Méthode pour la déconnexion
  logout(): void {
    // Clear all user authentication and session data
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('firstName');
    localStorage.removeItem('lastName');
    localStorage.removeItem('userId');
    localStorage.removeItem('accountId');

    // Clear user dashboard data
    localStorage.removeItem('currentBalance');
    localStorage.removeItem('recentTransactions');

    // Clear admin data
    localStorage.removeItem('adminUsersData');

    
    localStorage.removeItem('cached_revenues');
    localStorage.removeItem('user_average_monthly_revenue');
    localStorage.removeItem('selectedFinancingOptions');
    localStorage.removeItem('savedOfferSelections');
    localStorage.removeItem('pendingOfferSelections');
    localStorage.removeItem('additionalDocuments');

    // Clear step/workflow state - CRITICAL for multi-user testing
    localStorage.removeItem('funding_step_state');

    // Clear dynamic RIB file keys (rib1_file, rib2_file, etc.)
    for (let i = 1; i <= 12; i++) {
      localStorage.removeItem(`rib${i}_file`);
    }

    this.showDropdown = false;
    this.router.navigate(['/sign-in']);
  }
}