import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface UserSelectionResponse {
  selectedOffer?: string | null;
  selectedOffers?: string[];
  message?: string;
}

interface FundingOption {
  title: string;
  badge: string;
  type: string;
  amount: number;
  structure: string;
  payback: number;
  term: string;
  payment: string;
  frequency: string;
  features: string[];
}

interface FundingCategory {
  title: string;
  description: string;
  range: string;
  options: FundingOption[];
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
    private http: HttpClient
  ) {
    this.initializeFundingCategories();
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

  private initializeFundingCategories(): void {
    // Copie identique de la fonction du dashboard
    this.fundingCategories = [
      {
        title: 'Category 1 – Up to $100K',
        description: 'Funding options available for amounts up to $100,000',
        range: 'Up to $100K',
        options: [
          {
            title: 'MCA Short Term',
            badge: 'Short Term',
            type: 'short',
            amount: 50000,
            structure: 'MCA',
            payback: 70500,
            term: '6 months',
            payment: '≈ $2,711/wk',
            frequency: 'Weekly',
            features: []
          },
          {
            title: 'Option 2 (Guarantee)',
            badge: 'Guaranteed',
            type: 'guarantee',
            amount: 500000,
            structure: 'Guaranteed',
            payback: 600000,
            term: '60 months',
            payment: '$10K/mo',
            frequency: 'Monthly',
            features: []
          },
          {
            title: 'Capital Injection',
            badge: 'Capital',
            type: 'capital',
            amount: 1000000,
            structure: 'Equity/Loan',
            payback: 1340000,
            term: '72 months',
            payment: '≈ $18.6K/mo',
            frequency: 'Monthly',
            features: []
          }
        ]
      },
      {
        title: 'Category 2 – Above $100K',
        description: 'Funding options available for amounts above $100,000',
        range: 'Above $100K',
        options: [
          {
            title: 'MCA Short Term',
            badge: 'Short Term',
            type: 'short',
            amount: 150000,
            structure: 'MCA',
            payback: 210000,
            term: '7 months',
            payment: '≈ $7,000/wk',
            frequency: 'Weekly',
            features: []
          },
          {
            title: 'Option 2 (Guarantee)',
            badge: 'Guaranteed',
            type: 'guarantee',
            amount: 1000000,
            structure: 'Guaranteed',
            payback: 1200000,
            term: '60 months',
            payment: '$20K/mo',
            frequency: 'Monthly',
            features: []
          },
          {
            title: 'Capital Injection',
            badge: 'Capital',
            type: 'capital',
            amount: 2000000,
            structure: 'Equity/Loan',
            payback: 2660000,
            term: '72 months',
            payment: '≈ $36.9K/mo',
            frequency: 'Monthly',
            features: []
          }
        ]
      },
      {
        title: 'Category 3 – Above $200K',
        description: 'Funding options available for amounts above $200,000',
        range: 'Above $200K',
        options: [
          {
            title: 'MCA Short Term',
            badge: 'Short Term',
            type: 'short',
            amount: 250000,
            structure: 'MCA',
            payback: 345000,
            term: '8 months',
            payment: '≈ $9,857/wk',
            frequency: 'Weekly',
            features: []
          },
          {
            title: 'Option 2 (Guarantee)',
            badge: 'Guaranteed',
            type: 'guarantee',
            amount: 1500000,
            structure: 'Guaranteed',
            payback: 1740000,
            term: '60 months',
            payment: '$29K/mo',
            frequency: 'Monthly',
            features: []
          },
          {
            title: 'Capital Injection',
            badge: 'Capital',
            type: 'capital',
            amount: 3000000,
            structure: 'Equity/Loan',
            payback: 3960000,
            term: '72 months',
            payment: '≈ $55K/mo',
            frequency: 'Monthly',
            features: []
          }
        ]
      },
      {
        title: 'Category 4 – Above $300K',
        description: 'Funding options available for amounts above $300,000',
        range: 'Above $300K',
        options: [
          {
            title: 'MCA Short Term',
            badge: 'Short Term',
            type: 'short',
            amount: 400000,
            structure: 'MCA',
            payback: 544000,
            term: '9 months',
            payment: '≈ $13,949/wk',
            frequency: 'Weekly',
            features: []
          },
          {
            title: 'Option 2 (Guarantee)',
            badge: 'Guaranteed',
            type: 'guarantee',
            amount: 2000000,
            structure: 'Guaranteed',
            payback: 2300000,
            term: '60 months',
            payment: '$38,333/mo',
            frequency: 'Monthly',
            features: []
          },
          {
            title: 'Capital Injection',
            badge: 'Capital',
            type: 'capital',
            amount: 4000000,
            structure: 'Equity/Loan',
            payback: 5280000,
            term: '72 months',
            payment: '≈ $73.3K/mo',
            frequency: 'Monthly',
            features: []
          }
        ]
      },
      {
        title: 'Category 5 – Above $500K',
        description: 'Funding options available for amounts above $500,000',
        range: 'Above $500K',
        options: [
          {
            title: 'MCA Short Term',
            badge: 'Short Term',
            type: 'short',
            amount: 750000,
            structure: 'MCA',
            payback: 1020000,
            term: '10 months',
            payment: '≈ $23,182/wk',
            frequency: 'Weekly',
            features: []
          },
          {
            title: 'Option 2 (Guarantee)',
            badge: 'Guaranteed',
            type: 'guarantee',
            amount: 2500000,
            structure: 'Guaranteed',
            payback: 2875000,
            term: '60 months',
            payment: '$47,917/mo',
            frequency: 'Monthly',
            features: []
          },
          {
            title: 'Capital Injection',
            badge: 'Capital',
            type: 'capital',
            amount: 5000000,
            structure: 'Equity/Loan',
            payback: 6600000,
            term: '72 months',
            payment: '≈ $91.6K/mo',
            frequency: 'Monthly',
            features: []
          }
        ]
      }
    ];
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
    // Marquer la première visite comme complétée
    localStorage.setItem('hasSeenFundingUnlocked', 'true');
    
    // Rediriger vers le dashboard
    this.router.navigate(['/dashboard']);
  }

  getFormattedAmount(): string {
    return `$${this.fundingAmount.toLocaleString()}`;
  }
}