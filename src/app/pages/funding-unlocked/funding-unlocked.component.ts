import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FundingOption, FundingCategory, FUNDING_CATEGORIES } from '../../../interfaces/funding-categories';
import { StepService, FUNDING_STEPS } from '../../../services/step.service';

interface UserSelectionResponse {
  selectedOffer?: string | null;
  selectedOffers?: string[];
  message?: string;
}

@Component({
  selector: 'app-funding-unlocked',
  templateUrl: './funding-unlocked.component.html',
  styleUrl: './funding-unlocked.component.css'
})
export class FundingUnlockedComponent implements OnInit, OnDestroy {
  // Animation states
  isLoading: boolean = true;
  loadingProgress: number = 0;
  isCelebrating: boolean = false;
  showContent: boolean = false;
  
  // Funding info
  fundingAmount: number = 0;
  selectedFundingOption: FundingOption | null = null;
  
  // Timer
  private loadingTimer: any;
  private apiUrl = environment.apiUrl;
  
  // Confetti animation
  confettiArray = Array(50).fill(0);
  
  // Funding categories (same as dashboard)
  fundingCategories: FundingCategory[] = [];

  constructor(
    private router: Router,
    private http: HttpClient,
    private stepService: StepService
  ) {
    this.fundingCategories = FUNDING_CATEGORIES;
  }

  ngOnInit(): void {
    // Charger les données de l'utilisateur
    this.loadUserSelection();
    
    // Démarrer l'animation de chargement
    this.startLoadingAnimation();
  }

  ngOnDestroy(): void {
    if (this.loadingTimer) {
      clearInterval(this.loadingTimer);
    }
  }

  private startLoadingAnimation(): void {
    this.isLoading = true;
    this.loadingProgress = 0;
    
    const totalDuration = 45000;
    const updateInterval = 50;
    const incrementPerUpdate = (100 / (totalDuration / updateInterval));
    
    this.loadingTimer = setInterval(() => {
      this.loadingProgress += incrementPerUpdate;
      
      if (this.loadingProgress >= 100) {
        this.loadingProgress = 100;
        clearInterval(this.loadingTimer);
        this.startCelebration();
      }
    }, updateInterval);
  }

  private startCelebration(): void {
    this.isLoading = false;
    this.isCelebrating = true;
    
    setTimeout(() => {
      this.showContent = true;
    }, 1500);
  }

  private loadUserSelection(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No token found');
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.get<UserSelectionResponse>(
      `${this.apiUrl}/offers/user-selections`, 
      { headers }
    ).subscribe({
      next: (response) => {
        let selectedOffer: string | null = null;
        
        if (response.selectedOffer) {
          selectedOffer = response.selectedOffer;
        } else if (response.selectedOffers && response.selectedOffers.length > 0) {
          selectedOffer = response.selectedOffers[0];
        }
        
        if (selectedOffer) {
          this.parseSelectedOffer(selectedOffer);
        }
      },
      error: (error) => {
        console.error('Error loading user selection:', error);
      }
    });
  }

  private parseSelectedOffer(selectedOffer: string): void {
    try {
      const parts = selectedOffer.split('.');
      if (parts.length === 2) {
        const categoryIndex = parseInt(parts[0], 10) - 1;
        const optionIndex = parseInt(parts[1], 10) - 1;

        if (this.isValidSelection(categoryIndex, optionIndex)) {
          this.selectedFundingOption = this.fundingCategories[categoryIndex].options[optionIndex];
          this.fundingAmount = this.selectedFundingOption.amount;
        }
      }
    } catch (error) {
      console.error('Error parsing selected offer:', error);
    }
  }

  private isValidSelection(categoryIndex: number, optionIndex: number): boolean {
    return categoryIndex >= 0 && 
           categoryIndex < this.fundingCategories.length &&
           optionIndex >= 0 && 
           optionIndex < this.fundingCategories[categoryIndex].options.length;
  }

  proceedToDashboard(): void {
    // Transition to DASHBOARD step
    this.stepService.transitionTo(FUNDING_STEPS.DASHBOARD).subscribe({
      next: () => {
        console.log('Step transitioned to DASHBOARD');
        // Rediriger vers le dashboard
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        console.error('Failed to update step:', error);
        // Navigate anyway - user has completed all steps
        this.router.navigate(['/dashboard']);
      }
    });
  }

  getFormattedAmount(): string {
    return `$${this.fundingAmount.toLocaleString()}`;
  }
}