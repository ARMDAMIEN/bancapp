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

interface SignatureStatusResponse {
  hasSigned: boolean;
  email: string;
}

interface BankInfo {
  accountHolderName: string;
  routingNumber: string;
  accountNumber: string;
  bankName: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  // Propriétés pour le chargement initial
  isInitialLoading: boolean = false;
  loadingProgress: number = 0;
  isCelebrating = false;
  loadingMessage: string = 'Unlocking your funds...';
  confettiArray = Array(50).fill(0);

  private loadingTimer: any;

  // Informations bancaires
  bankInfo: BankInfo = {
    accountHolderName: '',
    routingNumber: '',
    accountNumber: '',
    bankName: ''
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
  
  // État de signature - IMPORTANT: null au départ pour gérer le chargement
  hasSigned: boolean | null = null;
  isLoadingSignatureStatus: boolean = true;
  
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
  private apiUrl = environment.apiUrl;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {
    this.initializeFundingCategories();
  }

  ngOnInit(): void {
    // On charge d'abord le statut de signature
    this.loadSignatureStatus();
  }

  ngOnDestroy(): void {
    this.cleanupTimers();
    if (this.loadingTimer) {
      clearInterval(this.loadingTimer);
    }
  }

  private startInitialLoading(): void {
    this.isInitialLoading = true;
    this.isCelebrating = false;
    this.loadingProgress = 0;
    
    const totalDuration = 60000; 
    const updateInterval = 100;
    const incrementPerUpdate = (100 / (totalDuration / updateInterval));
    
    const messages = [
      'Unlocking your funds...',
      'Verifying your account...',
      'Processing your funding option...',
      'Preparing your dashboard...',
      'Almost ready...'
    ];
    
    let messageIndex = 0;
    let elapsed = 0;
    
    this.loadingTimer = setInterval(() => {
      elapsed += updateInterval;
      this.loadingProgress += incrementPerUpdate;
      
      const newMessageIndex = Math.floor((elapsed / totalDuration) * messages.length);
      if (newMessageIndex !== messageIndex && newMessageIndex < messages.length) {
        messageIndex = newMessageIndex;
        this.loadingMessage = messages[messageIndex];
      }
      
      if (this.loadingProgress >= 100) {
        this.loadingProgress = 100;
      }
      
      if (elapsed >= totalDuration) {
        this.startCelebration();
      }
    }, updateInterval);
  }

  private startCelebration(): void {
    clearInterval(this.loadingTimer);
    this.isCelebrating = true;
    this.loadingMessage = '🎊 Success! Welcome to your dashboard! 🎊';
    
    setTimeout(() => {
      this.completeInitialLoading();
    }, 2500);
  }

  private completeInitialLoading(): void {
    if (this.loadingTimer) {
      clearInterval(this.loadingTimer);
    }
    
    this.loadingProgress = 100;
    this.loadingMessage = 'Loading complete!';
    
    localStorage.setItem('initialLoadingCompleted', 'true');
    
    setTimeout(() => {
      this.isCelebrating = false;
      this.isInitialLoading = false;
      this.loadDashboardData();
    }, 500);
  }

  private loadDashboardData(): void {
    this.loadUserProfile();
    this.loadUserSelections();
    this.loadBankInfo();
    this.loadWithdrawalStatus();
    this.setupAutoRefresh();
  }

  private loadSignatureStatus(): void {
    this.isLoadingSignatureStatus = true;
    
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No authentication token found');
      this.hasSigned = false;
      this.isLoadingSignatureStatus = false;
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.get<SignatureStatusResponse>(`${this.apiUrl}/api/signature/status`, { headers })
      .pipe(
        catchError((error) => {
          console.error('Error loading signature status:', error);
          return of({ hasSigned: false, email: '' });
        })
      )
      .subscribe({
        next: (response) => {
          // On met à jour hasSigned AVANT tout traitement
          this.hasSigned = response.hasSigned;
          this.isLoadingSignatureStatus = false;
          
          const initialLoadingCompleted = localStorage.getItem('initialLoadingCompleted');
          
          if (this.hasSigned && initialLoadingCompleted !== 'true') {
            console.log('🎬 Starting initial loading animation...');
            this.startInitialLoading();
          } else if (this.hasSigned && initialLoadingCompleted === 'true') {
            console.log('⚡ Loading completed previously, loading dashboard...');
            this.loadDashboardData();
          } else {
            console.log('⚠️ User has not signed yet');
          }
        },
        error: (error) => {
          console.error('Failed to load signature status:', error);
          this.hasSigned = false;
          this.isLoadingSignatureStatus = false;
        }
      });
  }

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

  private saveBankInfo(): void {
    localStorage.setItem('bankInfo', JSON.stringify(this.bankInfo));
  }

  private loadWithdrawalStatus(): void {
    const withdrawalStatus = localStorage.getItem('withdrawalPending');
    this.withdrawalPending = withdrawalStatus === 'true';
  }

  private saveWithdrawalStatus(): void {
    localStorage.setItem('withdrawalPending', this.withdrawalPending.toString());
  }

  private clearWithdrawalStatus(): void {
    this.withdrawalPending = false;
    localStorage.removeItem('withdrawalPending');
  }

  isBankFormValid(): boolean {
    const { accountHolderName, routingNumber, accountNumber, bankName} = this.bankInfo;
    
    return accountHolderName.trim() !== '' &&
           routingNumber.trim() !== '' &&
           routingNumber.length === 9 &&
           /^[0-9]{9}$/.test(routingNumber) &&
           accountNumber.trim() !== '' &&
           bankName.trim() !== '';
  }

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
      }
    });
  }

  private getUserSelections(headers: HttpHeaders): Observable<UserSelectionResponse> {
    return this.http.get<UserSelectionResponse>(`${this.apiUrl}/offers/user-selections`, { headers })
      .pipe(
        catchError((error) => {
          console.error('API call failed:', error);
          return of({ selectedOffer: null, message: 'Failed to load selections' });
        })
      );
  }

  private handleUserSelectionResponse(response: UserSelectionResponse): void {
    console.log('Handling response:', response);
    
    let selectedOffer: string | null = null;
    
    if (response.selectedOffer) {
      selectedOffer = response.selectedOffer;
    } else if (response.selectedOffers && response.selectedOffers.length > 0) {
      selectedOffer = response.selectedOffers[0];
    }
    
    if (selectedOffer) {
      this.selectedOffer = selectedOffer;
      console.log('Selected offer found:', selectedOffer);
      this.parseSelectedOffer(selectedOffer);
    } else {
      console.log('No selection found');
      this.selectedOffer = null;
      this.selectedCategory = null;
      this.selectedOption = null;
      this.selectedFundingOption = null;
    }
  }

  private parseSelectedOffer(selectedOffer: string): void {
    try {
      const parts = selectedOffer.split('.');
      if (parts.length === 2) {
        const categoryIndex = parseInt(parts[0], 10) - 1;
        const optionIndex = parseInt(parts[1], 10) - 1;

        if (this.isValidSelection(categoryIndex, optionIndex)) {
          this.selectedCategory = categoryIndex;
          this.selectedOption = optionIndex;
          this.selectedFundingOption = this.fundingCategories[categoryIndex].options[optionIndex];
          
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

  private isValidSelection(categoryIndex: number, optionIndex: number): boolean {
    return categoryIndex >= 0 && 
           categoryIndex < this.fundingCategories.length &&
           optionIndex >= 0 && 
           optionIndex < this.fundingCategories[categoryIndex].options.length;
  }

  private resetSelection(): void {
    this.selectedCategory = null;
    this.selectedOption = null;
    this.selectedFundingOption = null;
  }

  private updateBalanceFromSelection(): void {
    if (this.selectedFundingOption) {
        this.currentBalance = this.selectedFundingOption.amount;
        this.saveBalance();
    }
  }

  private loadUserProfile(): void {
    const firstName = localStorage.getItem('firstName') || 'User';
    const lastName = localStorage.getItem('lastName') || '';
    this.clientName = `${firstName} ${lastName}`.trim();
    
    this.accountId = localStorage.getItem('accountId') || "CA01D";
  }

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

  private generateRandomRoutingNumber(): string {
    return Math.floor(100000000 + Math.random() * 900000000).toString();
  }

  private generateRandomAccountNumber(): string {
    const length = Math.floor(Math.random() * 5) + 10;
    let accountNumber = '';
    for (let i = 0; i < length; i++) {
      accountNumber += Math.floor(Math.random() * 10).toString();
    }
    return accountNumber;
  }

  private setupAutoRefresh(): void {
    this.refreshTimer = setInterval(() => {
      this.lastUpdate = new Date();
      this.loadUserSelections();
      // Ne pas recharger le statut de signature en refresh auto
      // pour éviter les problèmes de race condition
    }, 30000);
  }

  private cleanupTimers(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  private saveBalance(): void {
    localStorage.setItem('currentBalance', this.currentBalance.toString());
  }

  private saveTransactions(): void {
    localStorage.setItem('recentTransactions', JSON.stringify(this.recentTransactions));
  }

  // Méthodes publiques pour l'affichage

  getSelectedCategoryName(): string {
    if (this.selectedCategory !== null && this.fundingCategories[this.selectedCategory]) {
      return this.fundingCategories[this.selectedCategory].title;
    }
    return 'No category selected';
  }

  getSelectedOptionName(): string {
    if (this.selectedFundingOption) {
      return this.selectedFundingOption.title;
    }
    return 'No option selected';
  }

  hasUserSelection(): boolean {
    return this.selectedOffer !== null && this.selectedFundingOption !== null;
  }

  getFormattedSelectedAmount(): string {
    if (this.selectedFundingOption) {
      return `$${this.selectedFundingOption.amount.toLocaleString()}`;
    }
    return '$0';
  }

  getBalanceStatus(): string {
    if (this.currentBalance >= 25000) return 'high';
    if (this.currentBalance >= 5000) return 'medium';
    return 'low';
  }

  getBalanceStatusText(): string {
    const status = this.getBalanceStatus();
    switch (status) {
      case 'high': return 'Excellent Balance';
      case 'medium': return 'Good Balance';
      case 'low': return 'Low Balance';
      default: return 'Balance';
    }
  }

  getTransactionIcon(type: string): string {
    return type === 'credit' ? '⬆️' : '⬇️';
  }

  openWithdrawModal(): void {
    if (this.currentBalance <= 0 || this.isProcessing || this.withdrawalPending) {
      return;
    }
    this.loadBankInfo();
    this.showWithdrawModal = true;
  }

  closeWithdrawModal(): void {
    if (!this.isProcessing) {
      this.showWithdrawModal = false;
    }
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
  }

  finalizePayment(): void {
    this.isProcessing = true;

    setTimeout(() => {
      const withdrawalAmount = this.currentBalance;
      
      this.withdrawalPending = true;
      this.saveWithdrawalStatus();
      
      const withdrawalTransaction: Transaction = {
        id: `TXN${Date.now()}`,
        type: 'debit',
        description: `Payment - Transfer to ${this.paymentBankInfo.bankName}`,
        amount: withdrawalAmount,
        date: new Date(),
        status: 'pending'
      };

      this.recentTransactions.unshift(withdrawalTransaction);
      
      this.lastUpdate = new Date();
      
      this.saveBalance();
      this.saveTransactions();
      
      this.isProcessing = false;
      this.showPaymentModal = false;
      
      this.router.navigate(['/payment-confirmation'], {
        queryParams: {
          amount: withdrawalAmount,
          transactionId: withdrawalTransaction.id,
          type: 'payment',
          bankName: this.paymentBankInfo.bankName,
          accountHolder: this.paymentBankInfo.accountHolder
        }
      });
      
    }, 2500);
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Copied to clipboard:', text);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  }

  getPaymentAmount(): string {
    if (this.selectedFundingOption) {
      return this.selectedFundingOption.payment;
    }
    return '$0';
  }

  proceedToPayment(): void {
    if (this.currentBalance <= 0 || this.isProcessing || !this.isBankFormValid()) {
      return;
    }

    this.saveBankInfo();
    this.generateRandomPaymentBankInfo();

    this.showWithdrawModal = false;
    this.showPaymentModal = true;
  }

  logout(): void {
    const keysToRemove = [
      'token',
      'userRole', 
      'firstName',
      'lastName',
      'currentBalance',
      'recentTransactions',
      'accountId',
      'bankInfo',
      'withdrawalPending'
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    this.router.navigate(['/sign-in']);
  }

  refreshAccountData(): void {
    this.loadUserSelections();
    this.loadSignatureStatus();
    this.lastUpdate = new Date();
  }

  canWithdraw(): boolean {
    return this.currentBalance > 0 && !this.isProcessing && !this.withdrawalPending;
  }

  getWithdrawButtonText(): string {
    if (this.withdrawalPending) {
      return 'Withdrawal Pending';
    }
    if (this.currentBalance <= 0) {
      return 'No Funds Available';
    }
    return 'Withdraw Funds';
  }

  cancelWithdrawal(): void {
    this.clearWithdrawalStatus();
  }

  viewTransactionHistory(): void {
    this.router.navigate(['/transactions']);
  }

  navigateToSettings(): void {
    this.router.navigate(['/account-settings']);
  }

  navigateToOfferSelection(): void {
    this.router.navigate(['/offer-selection']);
  }

  formatTransactionAmount(transaction: Transaction): string {
    const sign = transaction.type === 'credit' ? '+' : '-';
    return `${sign}$${transaction.amount.toFixed(2)}`;
  }

  getRecentBalanceChange(): number {
    const recentTransactions = this.recentTransactions.slice(0, 5);
    return recentTransactions.reduce((total, tx) => {
      return total + (tx.type === 'credit' ? tx.amount : -tx.amount);
    }, 0);
  }

  getBalanceTrend(): 'up' | 'down' | 'stable' {
    const change = this.getRecentBalanceChange();
    if (change > 100) return 'up';
    if (change < -100) return 'down';
    return 'stable';
  }

  // Méthodes utilitaires pour la signature
  hasUserSigned(): boolean {
    return this.hasSigned === true;
  }

  getSignatureStatusText(): string {
    if (this.isLoadingSignatureStatus) {
      return 'Loading...';
    }
    return this.hasSigned ? 'Signed' : 'Not Signed';
  }

  getSignatureStatusClass(): string {
    return this.hasSigned ? 'signed' : 'not-signed';
  }
  
  // Méthode helper pour le template
  isSignatureStatusLoaded(): boolean {
    return this.hasSigned !== null;
  }
}