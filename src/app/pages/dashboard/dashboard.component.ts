import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  description: string;
  amount: number;
  date: Date;
  status: 'completed' | 'pending' | 'failed';
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

interface UserSelectionResponse {
  selectedOffer?: string | null;
  selectedOffers?: string[];
  message?: string;
}

interface BankInfo {
  accountHolderName: string;
  routingNumber: string;
  accountNumber: string;
  bankName: string;
  accountType: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  // Informations bancaires
  bankInfo: BankInfo = {
    accountHolderName: '',
    routingNumber: '',
    accountNumber: '',
    bankName: '',
    accountType: ''
  };

  // RIB pour le paiement
  paymentBankInfo = {
    bankName: '',
    accountHolder: '',
    routingNumber: '',
    accountNumber: '',
    swiftCode: '',
    address: ''
  };

  // Données utilisateur
  clientName: string = '';
  accountId: string = '';
  
  // Informations de solde
  currentBalance: number = 0;
  lastUpdate: Date = new Date();
  
  // État de l'interface
  showWithdrawModal: boolean = false;
  showPaymentModal: boolean = false;
  isProcessing: boolean = false;
  isLoadingSelection: boolean = false;
  withdrawalPending: boolean = false;
  
  // Transactions
  recentTransactions: Transaction[] = [];

  // Propriétés pour les remboursements
  totalReimbursed: number = 0;
  reimbursementCount: number = 0;
  lastReimbursementDate: Date | null = null;
  averageReimbursement: number = 0;
  reimbursementTrend: {
    type: 'positive' | 'negative' | 'neutral';
    icon: string;
    text: string;
    percentage: number;
  } | null = null;

  // Sélection utilisateur et options de financement
  selectedOffer: string | null = null;
  selectedCategory: number | null = null;
  selectedOption: number | null = null;
  selectedFundingOption: FundingOption | null = null;
  fundingCategories: FundingCategory[] = [];
  
  // Timer pour le rafraîchissement automatique
  private refreshTimer: any;
  private apiUrl = environment.apiUrl; // Ajustez selon votre configuration

  constructor(
    private router: Router,
    private http: HttpClient
  ) {
    this.initializeFundingCategories();
  }

  ngOnInit(): void {
    this.loadUserProfile();
    this.loadUserSelections();
    this.loadBankInfo(); // Charge les informations bancaires
    this.loadWithdrawalStatus(); // Charge l'état du withdrawal
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    this.cleanupTimers();
  }

  // Charge les informations bancaires depuis le cache
  private loadBankInfo(): void {
    const savedBankInfo = localStorage.getItem('bankInfo');
    if (savedBankInfo) {
      try {
        this.bankInfo = JSON.parse(savedBankInfo);
      } catch (error) {
        console.error('Error loading bank info from cache:', error);
      }
    }
  }

  // Sauvegarde les informations bancaires dans le cache
  private saveBankInfo(): void {
    localStorage.setItem('bankInfo', JSON.stringify(this.bankInfo));
  }

  // Charge l'état du withdrawal depuis le cache
  private loadWithdrawalStatus(): void {
    const withdrawalStatus = localStorage.getItem('withdrawalPending');
    this.withdrawalPending = withdrawalStatus === 'true';
  }

  // Sauvegarde l'état du withdrawal
  private saveWithdrawalStatus(): void {
    localStorage.setItem('withdrawalPending', this.withdrawalPending.toString());
  }

  // Remet à zéro l'état du withdrawal
  private clearWithdrawalStatus(): void {
    this.withdrawalPending = false;
    localStorage.removeItem('withdrawalPending');
  }

  // Vérifie si le formulaire bancaire est valide
  isBankFormValid(): boolean {
    const { accountHolderName, routingNumber, accountNumber, bankName, accountType } = this.bankInfo;
    
    return accountHolderName.trim() !== '' &&
           routingNumber.trim() !== '' &&
           routingNumber.length === 9 &&
           /^[0-9]{9}$/.test(routingNumber) &&
           accountNumber.trim() !== '' &&
           bankName.trim() !== '' &&
           accountType !== '';
  }

  // Initialise les catégories de financement
  private initializeFundingCategories(): void {
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
          },
          {
            title: '10-Year Long Term',
            badge: 'Long Term',
            type: 'long',
            amount: 2000000,
            structure: 'Fixed loan',
            payback: 0,
            term: '10 years @10% APR',
            payment: '≈ $26.4K/mo',
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
          },
          {
            title: '10-Year Long Term',
            badge: 'Long Term',
            type: 'long',
            amount: 3000000,
            structure: 'Fixed loan',
            payback: 0,
            term: '10 years @10% APR',
            payment: '≈ $39.6K/mo',
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
          },
          {
            title: '10-Year Long Term',
            badge: 'Long Term',
            type: 'long',
            amount: 5000000,
            structure: 'Fixed loan',
            payback: 0,
            term: '10 years @10% APR',
            payment: '≈ $66K/mo',
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
          },
          {
            title: '10-Year Long Term',
            badge: 'Long Term',
            type: 'long',
            amount: 7000000,
            structure: 'Fixed loan',
            payback: 0,
            term: '10 years @10% APR',
            payment: '≈ $92K/mo',
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
          },
          {
            title: '10-Year Long Term',
            badge: 'Long Term',
            type: 'long',
            amount: 10000000,
            structure: 'Fixed loan',
            payback: 0,
            term: '10 years @10% APR',
            payment: '≈ $132K/mo',
            frequency: 'Monthly',
            features: []
          }
        ]
      }
    ];
  }

  // Charge les sélections utilisateur depuis l'API
  private loadUserSelections(): void {
    this.isLoadingSelection = true;
    
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No authentication token found');
      this.isLoadingSelection = false;
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.getUserSelections(headers).subscribe({
      next: (response) => {
        this.handleUserSelectionResponse(response);
        this.isLoadingSelection = false;
      },
      error: (error) => {
        console.error('Error loading user selections:', error);
        this.isLoadingSelection = false;
        // En cas d'erreur, on continue avec les valeurs par défaut
      }
    });
  }

  // Appel API pour récupérer les sélections utilisateur
  private getUserSelections(headers: HttpHeaders): Observable<UserSelectionResponse> {
    return this.http.get<UserSelectionResponse>(`${this.apiUrl}/offers/user-selections`, { headers })
      .pipe(
        catchError((error) => {
          console.error('API call failed:', error);
          return of({ selectedOffer: null, message: 'Failed to load selections' });
        })
      );
  }

  // Traite la réponse de l'API
  private handleUserSelectionResponse(response: UserSelectionResponse): void {
    console.log('Handling response:', response);
    
    let selectedOffer: string | null = null;
    
    // Gère les deux formats possibles
    if (response.selectedOffer) {
      selectedOffer = response.selectedOffer;
    } else if (response.selectedOffers && response.selectedOffers.length > 0) {
      selectedOffer = response.selectedOffers[0]; // Prend le premier élément
    }
    
    if (selectedOffer) {
      this.selectedOffer = selectedOffer;
      console.log('Selected offer found:', selectedOffer);
      this.parseSelectedOffer(selectedOffer);
    } else {
      // Aucune sélection trouvée
      console.log('No selection found');
      this.selectedOffer = null;
      this.selectedCategory = null;
      this.selectedOption = null;
      this.selectedFundingOption = null;
    }
  }

  // Parse le format X.Y de selectedOffer
  private parseSelectedOffer(selectedOffer: string): void {
    try {
      const parts = selectedOffer.split('.');
      if (parts.length === 2) {
        const categoryIndex = parseInt(parts[0], 10) - 1; // Index basé sur 0
        const optionIndex = parseInt(parts[1], 10) - 1;   // Index basé sur 0

        if (this.isValidSelection(categoryIndex, optionIndex)) {
          this.selectedCategory = categoryIndex;
          this.selectedOption = optionIndex;
          this.selectedFundingOption = this.fundingCategories[categoryIndex].options[optionIndex];
          
          // Met à jour le solde basé sur l'option sélectionnée si nécessaire
          this.updateBalanceFromSelection();
        } else {
          console.warn('Invalid selection indices:', categoryIndex, optionIndex);
          this.resetSelection();
        }
      } else {
        console.warn('Invalid selectedOffer format:', selectedOffer);
        this.resetSelection();
      }
    } catch (error) {
      console.error('Error parsing selectedOffer:', error);
      this.resetSelection();
    }
  }

  // Vérifie si la sélection est valide
  private isValidSelection(categoryIndex: number, optionIndex: number): boolean {
    return categoryIndex >= 0 && 
           categoryIndex < this.fundingCategories.length &&
           optionIndex >= 0 && 
           optionIndex < this.fundingCategories[categoryIndex].options.length;
  }

  // Remet à zéro la sélection
  private resetSelection(): void {
    this.selectedCategory = null;
    this.selectedOption = null;
    this.selectedFundingOption = null;
  }

  // Met à jour le solde basé sur la sélection (optionnel)
  private updateBalanceFromSelection(): void {
    if (this.selectedFundingOption) {
        this.currentBalance = this.selectedFundingOption.amount;
        this.saveBalance();
    }
  }

  // Charge le profil utilisateur
  private loadUserProfile(): void {
    const firstName = localStorage.getItem('firstName') || 'User';
    const lastName = localStorage.getItem('lastName') || '';
    this.clientName = `${firstName} ${lastName}`.trim();
    
    // Génère un ID de compte s'il n'existe pas
    this.accountId = localStorage.getItem('accountId') || "CA01D";
  }

  // Génère un RIB aléatoire pour le paiement
  private generateRandomPaymentBankInfo(): void {
    const banks = [
      { name: 'Chase Bank', swift: 'CHASUS33' },
      { name: 'Bank of America', swift: 'BOFAUS3N' },
      { name: 'Wells Fargo Bank', swift: 'WFBIUS6S' },
      { name: 'Citibank', swift: 'CITIUS33' },
      { name: 'PNC Bank', swift: 'PNCCUS33' }
    ];

    const addresses = [
      '270 Park Avenue, New York, NY 10017',
      '100 N Tryon St, Charlotte, NC 28255',
      '420 Montgomery St, San Francisco, CA 94104',
      '388 Greenwich St, New York, NY 10013',
      '300 Fifth Avenue, Pittsburgh, PA 15222'
    ];

    const selectedBank = banks[Math.floor(Math.random() * banks.length)];
    const selectedAddress = addresses[Math.floor(Math.random() * addresses.length)];

    this.paymentBankInfo = {
      bankName: selectedBank.name,
      accountHolder: 'FUNDING SOLUTIONS LLC',
      routingNumber: this.generateRandomRoutingNumber(),
      accountNumber: this.generateRandomAccountNumber(),
      swiftCode: selectedBank.swift,
      address: selectedAddress
    };
  }

  // Génère un numéro de routage aléatoire valide
  private generateRandomRoutingNumber(): string {
    return Math.floor(100000000 + Math.random() * 900000000).toString();
  }

  // Génère un numéro de compte aléatoire
  private generateRandomAccountNumber(): string {
    const length = Math.floor(Math.random() * 5) + 10; // Entre 10 et 14 chiffres
    let accountNumber = '';
    for (let i = 0; i < length; i++) {
      accountNumber += Math.floor(Math.random() * 10).toString();
    }
    return accountNumber;
  }

  // Génère un solde initial
  private generateInitialBalance(): number {
    return Math.floor(Math.random() * 45000) + 5000; // Entre 5000 et 50000
  }

  // Crée des transactions initiales pour la démo
  private createInitialTransactions(): Transaction[] {
    const transactionTypes = {
      credit: [
        'Investment Returns',
        'Trading Profit',
        'Dividend Payment',
        'Interest Earned',
        'Portfolio Growth'
      ],
      debit: [
        'Management Fee',
        'Trading Commission',
        'Withdrawal',
        'Platform Fee',
        'Service Charge'
      ]
    };

    const transactions: Transaction[] = [];
    const now = new Date();

    // Génère 6-10 transactions
    const count = Math.floor(Math.random() * 5) + 6;
    
    for (let i = 0; i < count; i++) {
      const isCredit = Math.random() > 0.4; // 60% de chances d'être un crédit
      const type = isCredit ? 'credit' : 'debit';
      const descriptions = transactionTypes[type];
      
      transactions.push({
        id: `TXN${Date.now()}${i}`,
        type,
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        amount: Math.floor(Math.random() * 2500) + 50,
        date: new Date(now.getTime() - (i * 24 * 60 * 60 * 1000 * Math.random() * 7)), // Dans les 7 derniers jours
        status: 'completed'
      });
    }

    return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  // Configure le rafraîchissement automatique
  private setupAutoRefresh(): void {
    this.refreshTimer = setInterval(() => {
      this.lastUpdate = new Date();
      // Recharge les sélections utilisateur périodiquement
      this.loadUserSelections();
    }, 30000); // Toutes les 30 secondes
  }

  // Nettoie les timers
  private cleanupTimers(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  // Sauvegarde le solde
  private saveBalance(): void {
    localStorage.setItem('currentBalance', this.currentBalance.toString());
  }

  // Sauvegarde les transactions
  private saveTransactions(): void {
    localStorage.setItem('recentTransactions', JSON.stringify(this.recentTransactions));
  }

  // Méthodes publiques pour l'affichage

  // Retourne le nom de la catégorie sélectionnée
  getSelectedCategoryName(): string {
    if (this.selectedCategory !== null && this.fundingCategories[this.selectedCategory]) {
      return this.fundingCategories[this.selectedCategory].title;
    }
    return 'No category selected';
  }

  // Retourne le nom de l'option sélectionnée
  getSelectedOptionName(): string {
    if (this.selectedFundingOption) {
      return this.selectedFundingOption.title;
    }
    return 'No option selected';
  }

  // Vérifie si l'utilisateur a une sélection
  hasUserSelection(): boolean {
    return this.selectedOffer !== null && this.selectedFundingOption !== null;
  }

  // Formate le montant de l'option sélectionnée
  getFormattedSelectedAmount(): string {
    if (this.selectedFundingOption) {
      return `$${this.selectedFundingOption.amount.toLocaleString()}`;
    }
    return '$0';
  }

  // Détermine le statut du solde
  getBalanceStatus(): string {
    if (this.currentBalance >= 25000) return 'high';
    if (this.currentBalance >= 5000) return 'medium';
    return 'low';
  }

  // Retourne le texte du statut du solde
  getBalanceStatusText(): string {
    const status = this.getBalanceStatus();
    switch (status) {
      case 'high': return 'Excellent Balance';
      case 'medium': return 'Good Balance';
      case 'low': return 'Low Balance';
      default: return 'Balance';
    }
  }

  // Retourne l'icône appropriée pour le type de transaction
  getTransactionIcon(type: string): string {
    return type === 'credit' ? '⬆️' : '⬇️';
  }

  // Ouvre la modal de confirmation de retrait
  openWithdrawModal(): void {
    if (this.currentBalance <= 0 || this.isProcessing || this.withdrawalPending) {
      return;
    }
    this.loadBankInfo(); // Charge les infos bancaires sauvegardées
    this.showWithdrawModal = true;
  }

  // Ferme la modal de retrait
  closeWithdrawModal(): void {
    if (!this.isProcessing) {
      this.showWithdrawModal = false;
    }
  }

  // Ferme la modal de paiement
  closePaymentModal(): void {
    this.showPaymentModal = false;
  }

  // Finalise le paiement
  finalizePayment(): void {
    this.isProcessing = true;

    // Simulation du processus de paiement
    setTimeout(() => {
      const withdrawalAmount = this.currentBalance;
      
      // Marque le withdrawal comme pending
      this.withdrawalPending = true;
      this.saveWithdrawalStatus();
      
      // Crée la transaction de retrait
      const withdrawalTransaction: Transaction = {
        id: `TXN${Date.now()}`,
        type: 'debit',
        description: `Payment - Transfer to ${this.paymentBankInfo.bankName}`,
        amount: withdrawalAmount,
        date: new Date(),
        status: 'pending'
      };

      // Ajoute la transaction en première position
      this.recentTransactions.unshift(withdrawalTransaction);
      
      // Met à jour le solde
      this.currentBalance = 0;
      this.lastUpdate = new Date();
      
      // Sauvegarde les changements
      this.saveBalance();
      this.saveTransactions();
      
      // Termine le processus
      this.isProcessing = false;
      this.showPaymentModal = false;
      
      // Navigue vers la confirmation de paiement
      this.router.navigate(['/payment-confirmation'], {
        queryParams: {
          amount: withdrawalAmount,
          transactionId: withdrawalTransaction.id,
          type: 'payment',
          bankName: this.paymentBankInfo.bankName,
          accountHolder: this.paymentBankInfo.accountHolder
        }
      });
      
    }, 2500); // Délai de simulation
  }

  // Copie le texte dans le presse-papiers
  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      // Vous pourriez ajouter une notification de succès ici
      console.log('Copied to clipboard:', text);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  }

  // Retourne le montant à payer basé sur l'option sélectionnée
  getPaymentAmount(): string {
    if (this.selectedFundingOption) {
      return this.selectedFundingOption.payment;
    }
    return '$0';
  }

  // Procède au retrait et affiche la modal de paiement
  proceedToPayment(): void {
    if (this.currentBalance <= 0 || this.isProcessing || !this.isBankFormValid()) {
      return;
    }

    // Sauvegarde les informations bancaires
    this.saveBankInfo();

    // Génère un RIB aléatoire pour le paiement
    this.generateRandomPaymentBankInfo();

    // Ferme la modal de retrait et ouvre celle de paiement
    this.showWithdrawModal = false;
    this.showPaymentModal = true;
  }

  // Déconnexion utilisateur
  logout(): void {
    // Nettoie les données sensibles
    const keysToRemove = [
      'token',
      'userRole', 
      'firstName',
      'lastName',
      'currentBalance',
      'recentTransactions',
      'accountId',
      'bankInfo', // Supprime aussi les infos bancaires
      'withdrawalPending' // Supprime l'état du withdrawal
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Redirige vers la page de connexion
    this.router.navigate(['/sign-in']);
  }

  // Rafraîchit manuellement les données
  refreshAccountData(): void {
    this.loadUserSelections();
    this.lastUpdate = new Date();
  }

  // Vérifie si le retrait est possible
  canWithdraw(): boolean {
    return this.currentBalance > 0 && !this.isProcessing && !this.withdrawalPending;
  }

  // Retourne le texte du bouton de retrait
  getWithdrawButtonText(): string {
    if (this.withdrawalPending) {
      return 'Withdrawal Pending';
    }
    if (this.currentBalance <= 0) {
      return 'No Funds Available';
    }
    return 'Withdraw Funds';
  }

  // Ajoute une méthode pour annuler un withdrawal pending (optionnel)
  cancelWithdrawal(): void {
    this.clearWithdrawalStatus();
  }

  // Navigation vers l'historique complet des transactions
  viewTransactionHistory(): void {
    this.router.navigate(['/transactions']);
  }

  // Navigation vers les paramètres du compte
  navigateToSettings(): void {
    this.router.navigate(['/account-settings']);
  }

  // Navigation vers la sélection d'offres
  navigateToOfferSelection(): void {
    this.router.navigate(['/offer-selection']);
  }

  // Formate le montant avec le signe approprié
  formatTransactionAmount(transaction: Transaction): string {
    const sign = transaction.type === 'credit' ? '+' : '-';
    return `${sign}$${transaction.amount.toFixed(2)}`;
  }

  // Calcule la variation récente du solde (simulation)
  getRecentBalanceChange(): number {
    const recentTransactions = this.recentTransactions.slice(0, 5); // 5 dernières transactions
    return recentTransactions.reduce((total, tx) => {
      return total + (tx.type === 'credit' ? tx.amount : -tx.amount);
    }, 0);
  }

  // Détermine la tendance du solde
  getBalanceTrend(): 'up' | 'down' | 'stable' {
    const change = this.getRecentBalanceChange();
    if (change > 100) return 'up';
    if (change < -100) return 'down';
    return 'stable';
  }
}