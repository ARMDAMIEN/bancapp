import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { FundingOption, FundingCategory, FUNDING_CATEGORIES } from '../../../interfaces/funding-categories';

interface SelectedOption {
  categoryIndex: number;
  optionIndex: number;
  category: FundingCategory;
  option: FundingOption;
}

interface OfferSelectionRequest {
  selectedOffers: string[];
  totalAmount: number;
  selectionDate: string;
}

interface OfferSelectionResponse {
  message: string;
  userId: string;
  selectionId: string;
  selectedOffers: string[];
  totalAmount: number;
  savedAt: string;
}

interface CachedRevenueData {
  averageMonthlyRevenue: number;
  totalRevenue: number;
  calculatedAt: string;
  basedOnMonths: number;
  revenueBreakdown: {
    month1: number;
    month2: number;
    month3: number;
  };
}

@Component({
  selector: 'app-analyse-offer',
  templateUrl: './analyse-offer.component.html',
  styleUrl: './analyse-offer.component.css'
})
export class AnalyseOfferComponent implements OnInit, OnDestroy {

  // État de l'analyse
  isAnalyzing: boolean = true;
  analysisProgress: number = 0;
  currentStep: number = 1;
  
  // Sélections multiples -> Sélection unique
  selectedOption: SelectedOption | null = null;
  
  // Animation de chargement
  neuralNodes: any[] = Array(12).fill(null);
  dataParticles: any[] = Array(8).fill(null);
  
  // Timers pour les animations
  private progressTimer: any;
  private stepTimer: any;
  
  // État de la modal
  showConfirmationModal: boolean = false;
  isProcessing: boolean = false;
  
  // Configuration API
  private readonly apiUrl = environment.apiUrl;

  // Données de revenus récupérées du cache
  cachedRevenueData: CachedRevenueData | null = null;
  userAverageRevenue: number = 0;
  
  // Catégorie recommandée basée sur les revenus
  recommendedCategoryIndex: number = 0;
  showRevenueInfo: boolean = false;
  
  // Contrôle de l'affichage des catégories
  showAllCategories: boolean = false;

  // Catégories de financement
  fundingCategories: FundingCategory[] = FUNDING_CATEGORIES;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadCachedRevenueData();
    this.determineRecommendedCategory();
    this.startAnalysis();
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  // Charge les données de revenus depuis le cache
  private loadCachedRevenueData(): void {
    console.log('Looking for cached revenue data...');
    const cachedData = localStorage.getItem('user_average_monthly_revenue');
    console.log('Raw cached data:', cachedData);
    
    if (cachedData) {
      try {
        this.cachedRevenueData = JSON.parse(cachedData);
        this.userAverageRevenue = this.cachedRevenueData?.averageMonthlyRevenue || 0;
        console.log('Parsed revenue data:', this.cachedRevenueData);
        console.log('User average revenue:', this.userAverageRevenue);
        
        if (this.userAverageRevenue > 0) {
          this.showRevenueInfo = true;
          console.log('✅ Revenue info will be shown');
        } else {
          this.showRevenueInfo = false;
          console.log('❌ Revenue is 0, showing all categories');
        }
      } catch (error) {
        console.warn('Error loading cached revenue data:', error);
        this.showRevenueInfo = false;
      }
    } else {
      console.log('❌ No cached revenue data found in localStorage');
      // Essayer aussi avec l'autre clé potentielle
      const altCachedData = localStorage.getItem('cached_revenues');
      console.log('Trying alternative key "cached_revenues":', altCachedData);
      this.showRevenueInfo = false;
    }
  }

  // Détermine la catégorie recommandée basée sur le revenu moyen mensuel
  private determineRecommendedCategory(): void {
    if (!this.userAverageRevenue || this.userAverageRevenue <= 0) {
      this.recommendedCategoryIndex = 0; // Catégorie par défaut
      return;
    }

    // Logique de recommandation basée sur le revenu mensuel moyen en USD
    const monthlyRevenueUSD = this.userAverageRevenue;

    if (monthlyRevenueUSD <= 100000) { // Revenu mensuel jusqu'à $100K
      this.recommendedCategoryIndex = 0; // Category 1 – Up to $100K
    } else if (monthlyRevenueUSD <= 200000) { // Revenu mensuel de $100K à $200K
      this.recommendedCategoryIndex = 1; // Category 2 – Above $100K
    } else if (monthlyRevenueUSD <= 300000) { // Revenu mensuel de $200K à $300K
      this.recommendedCategoryIndex = 2; // Category 3 – Above $200K
    } else if (monthlyRevenueUSD <= 500000) { // Revenu mensuel de $300K à $500K
      this.recommendedCategoryIndex = 3; // Category 4 – Above $300K
    } else {
      this.recommendedCategoryIndex = 4; // Category 5 – Above $500K
    }

    console.log(`Recommended category: ${this.recommendedCategoryIndex + 1} based on monthly revenue: $${this.userAverageRevenue}`);
  }

  // Retourne la catégorie recommandée
  getRecommendedCategory(): FundingCategory {
    return this.fundingCategories[this.recommendedCategoryIndex];
  }

  // Vérifie si une catégorie est recommandée
  isCategoryRecommended(categoryIndex: number): boolean {
    return categoryIndex === this.recommendedCategoryIndex && this.showRevenueInfo;
  }

  // Retourne les informations de revenu formatées
  getFormattedMonthlyRevenue(): string {
    if (!this.userAverageRevenue) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(this.userAverageRevenue);
  }

  // Retourne le revenu annuel estimé
  getEstimatedAnnualRevenue(): string {
    if (!this.userAverageRevenue) return '';
    const annualRevenue = this.userAverageRevenue * 12;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(annualRevenue);
  }

  // Obtient les catégories filtrées (recommandée en premier si applicable)
  getOrderedCategories(): { category: FundingCategory; index: number; isRecommended: boolean }[] {
    console.log('getOrderedCategories called');
    console.log('showRevenueInfo:', this.showRevenueInfo);
    console.log('showAllCategories:', this.showAllCategories);
    console.log('recommendedCategoryIndex:', this.recommendedCategoryIndex);
    
    const categoriesWithIndex = this.fundingCategories.map((category, index) => ({
      category,
      index,
      isRecommended: this.isCategoryRecommended(index)
    }));

    console.log('Categories with recommendation status:', categoriesWithIndex);

    if (this.showRevenueInfo && !this.showAllCategories) {
      // Afficher seulement la catégorie recommandée
      const filteredCategories = categoriesWithIndex.filter(cat => cat.isRecommended);
      console.log('Returning only recommended category:', filteredCategories);
      return filteredCategories;
    } else if (this.showRevenueInfo && this.showAllCategories) {
      // Placer la catégorie recommandée en premier, puis les autres
      const sortedCategories = categoriesWithIndex.sort((a, b) => {
        if (a.isRecommended && !b.isRecommended) return -1;
        if (!a.isRecommended && b.isRecommended) return 1;
        return a.index - b.index;
      });
      console.log('Returning all categories with recommended first:', sortedCategories);
      return sortedCategories;
    }

    // Afficher toutes les catégories dans l'ordre normal si pas de données de revenus
    console.log('Returning all categories (no revenue data):', categoriesWithIndex);
    return categoriesWithIndex;
  }

  // Démarre l'analyse simulée
  startAnalysis(): void {
    this.isAnalyzing = true;
    this.analysisProgress = 0;
    this.currentStep = 1;

    // Simulation du progrès
    this.progressTimer = setInterval(() => {
      this.analysisProgress += Math.random() * 15;
      
      if (this.analysisProgress >= 100) {
        this.analysisProgress = 100;
        this.completeAnalysis();
      }
    }, 500);

    // Progression des étapes
    this.stepTimer = setTimeout(() => this.currentStep = 2, 1000);
    setTimeout(() => this.currentStep = 3, 2500);
    setTimeout(() => this.currentStep = 4, 4000);
    setTimeout(() => this.currentStep = 5, 5500);
  }

  // Termine l'analyse
  completeAnalysis(): void {
    this.clearTimers();
    
    setTimeout(() => {
      this.isAnalyzing = false;
    }, 1000);
  }

  // Nettoie les timers
  private clearTimers(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
    }
    if (this.stepTimer) {
      clearTimeout(this.stepTimer);
    }
  }

  // Sélectionne/désélectionne une option (sélection unique)
  selectOption(categoryIndex: number, optionIndex: number): void {
    const category = this.fundingCategories[categoryIndex];
    const option = category.options[optionIndex];
    
    const newSelection: SelectedOption = {
      categoryIndex,
      optionIndex,
      category,
      option
    };
    
    // Si la même option est déjà sélectionnée, la désélectionner
    if (this.selectedOption && 
        this.selectedOption.categoryIndex === categoryIndex && 
        this.selectedOption.optionIndex === optionIndex) {
      this.selectedOption = null;
    } else {
      // Sinon, remplacer la sélection actuelle par la nouvelle
      this.selectedOption = newSelection;
    }
  }

  // Vérifie si une option est sélectionnée
  isOptionSelected(categoryIndex: number, optionIndex: number): boolean {
    return this.selectedOption !== null &&
           this.selectedOption.categoryIndex === categoryIndex &&
           this.selectedOption.optionIndex === optionIndex;
  }

  // Vérifie s'il y a une option sélectionnée
  hasSelectedOptions(): boolean {
    return this.selectedOption !== null;
  }

  // Retourne le nombre d'options sélectionnées (0 ou 1)
  getSelectedCount(): number {
    return this.selectedOption ? 1 : 0;
  }

  // Retourne la liste des options sélectionnées (vide ou avec 1 élément)
  getSelectedOptions(): SelectedOption[] {
    return this.selectedOption ? [this.selectedOption] : [];
  }

  // Supprime la sélection
  removeSelection(categoryIndex: number, optionIndex: number): void {
    if (this.selectedOption && 
        this.selectedOption.categoryIndex === categoryIndex && 
        this.selectedOption.optionIndex === optionIndex) {
      this.selectedOption = null;
    }
  }

  // Efface la sélection
  clearSelections(): void {
    this.selectedOption = null;
  }

  // Calcule le montant total de financement
  getTotalFunding(): number {
    return this.selectedOption ? this.selectedOption.option.amount : 0;
  }

  // Procède avec l'option sélectionnée
  proceedWithSelections(): void {
    if (!this.hasSelectedOptions()) {
      return;
    }

    const selection = this.selectedOption!;
    
    // Stocker les informations de l'option sélectionnée
    const applicationData = {
      selectedOption: {
        category: selection.category.title,
        option: selection.option,
        selectionKey: `${selection.categoryIndex}-${selection.optionIndex}`
      },
      totalFunding: this.getTotalFunding(),
      timestamp: new Date().toISOString(),
      basedOnRevenue: this.cachedRevenueData ? {
        monthlyAverage: this.userAverageRevenue,
        recommendedCategory: this.getRecommendedCategory().title
      } : null
    };

    // Sauvegarder dans le localStorage pour la prochaine étape
    localStorage.setItem('selectedFinancingOptions', JSON.stringify(applicationData));

    console.log('Proceeding with financing option:', applicationData);

    this.showConfirmationModal = true;
  }

  // Retour à la page précédente
  goBack(): void {
    this.router.navigate(['/funding']);
  }

  // Relancer l'analyse
  restartAnalysis(): void {
    this.clearSelections();
    this.startAnalysis();
  }

  // Obtenir des informations de résumé pour une catégorie
  getCategorySelectionCount(categoryIndex: number): number {
    return (this.selectedOption && this.selectedOption.categoryIndex === categoryIndex) ? 1 : 0;
  }

  // Vérifier si une catégorie a la sélection
  categoryHasSelections(categoryIndex: number): boolean {
    return this.getCategorySelectionCount(categoryIndex) > 0;
  }

  // Obtenir le montant pour une catégorie spécifique
  getCategoryTotalAmount(categoryIndex: number): number {
    return (this.selectedOption && this.selectedOption.categoryIndex === categoryIndex) 
      ? this.selectedOption.option.amount 
      : 0;
  }

  // Méthode utilitaire pour formater les montants
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  }

  // Calculer le paiement de l'option sélectionnée
  getAverageMonthlyPayment(): number {
    if (!this.selectedOption) return 0;

    // Extraire le montant numérique du string de paiement
    const paymentStr = this.selectedOption.option.payment;
    const match = paymentStr.match(/\$?([\d,]+)/);
    if (match) {
      return parseFloat(match[1].replace(',', ''));
    }
    return 0;
  }

  // Ferme la modal de confirmation
  closeConfirmationModal(): void {
    this.showConfirmationModal = false;
  }

  // Enregistre la sélection vers le backend
  saveOfferSelections(): Observable<OfferSelectionResponse> {
    if (!this.selectedOption) {
      return throwError(() => ({ message: 'No option selected' }));
    }
    
    // Format la sélection pour le backend (ex: "1.4" pour catégorie 1 option 4)
    const categoryNumber = this.selectedOption.categoryIndex + 1; // +1 car les index commencent à 0
    const optionNumber = this.selectedOption.optionIndex + 1;     // +1 car les index commencent à 0
    const selectedOffer = `${categoryNumber}.${optionNumber}`;
    
    const requestData: OfferSelectionRequest = {
      selectedOffers: [selectedOffer],
      totalAmount: this.getTotalFunding(),
      selectionDate: new Date().toISOString()
    };
    
    return this.http.post<OfferSelectionResponse>(`${this.apiUrl}/offers/save-selections`, requestData)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  // Gestion des erreurs HTTP
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Failed to save selections';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else {
      switch (error.status) {
        case 400:
          errorMessage = error.error?.message || 'Invalid selection data';
          break;
        case 401:
          errorMessage = 'Authentication required';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later';
          break;
        default:
          errorMessage = error.error?.message || `Error: ${error.message}`;
      }
    }
    
    console.error('Offer selection error:', error);
    return throwError(() => ({ message: errorMessage }));
  }

  // Méthode utilitaire pour obtenir les détails de la sélection
  getSelectionDetails(): any {
    if (!this.selectedOption) return null;
    
    return {
      categoryIndex: this.selectedOption.categoryIndex + 1,
      optionIndex: this.selectedOption.optionIndex + 1,
      categoryTitle: this.selectedOption.category.title,
      optionTitle: this.selectedOption.option.title,
      amount: this.selectedOption.option.amount,
      selectionKey: `${this.selectedOption.categoryIndex + 1}.${this.selectedOption.optionIndex + 1}`
    };
  }

  confirmSelections(): void {
    if (!this.hasSelectedOptions()) {
      return;
    }

    this.isProcessing = true;
    
    // Sauvegarder la sélection vers le backend
    this.saveOfferSelections().subscribe({
      next: (response) => {
        console.log('Offer selection saved successfully:', response);
        
        // Sauvegarder les informations localement pour la session
        const localData = {
          selectionId: response.selectionId,
          selectedOption: this.getSelectionDetails(),
          totalFunding: this.getTotalFunding(),
          savedAt: response.savedAt,
          backendResponse: response,
          revenueContext: this.cachedRevenueData
        };
        
        localStorage.setItem('savedOfferSelections', JSON.stringify(localData));
        
        this.isProcessing = false;
        this.showConfirmationModal = false;
        
        // Naviguer vers la prochaine étape
        this.router.navigate(['/documentSupp']);
      },
      error: (error) => {
        console.error('Failed to save offer selection:', error);
        this.isProcessing = false;
        
        // Afficher l'erreur à l'utilisateur
        alert(`Failed to save your selection: ${error.message}. Please try again.`);
        
        // En cas d'erreur, sauvegarder quand même localement pour ne pas perdre le travail
        const fallbackData = {
          selectedOption: this.getSelectionDetails(),
          totalFunding: this.getTotalFunding(),
          timestamp: new Date().toISOString(),
          status: 'pending_save',
          revenueContext: this.cachedRevenueData
        };
        localStorage.setItem('pendingOfferSelections', JSON.stringify(fallbackData));
      }
    });
  }
}