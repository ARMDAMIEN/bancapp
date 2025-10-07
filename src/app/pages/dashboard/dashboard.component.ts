import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FundingOption, FundingCategory, FUNDING_CATEGORIES } from '../../../interfaces/funding-categories';

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  description: string;
  amount: number;
  date: Date;
  status: 'completed' | 'pending' | 'failed';
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
    this.fundingCategories = FUNDING_CATEGORIES;
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.cleanupTimers();
  }

  private loadDashboardData(): void {
    this.loadUserProfile();
    this.loadUserSelections();
    this.loadBankInfo();
    this.loadWithdrawalStatus();
    this.setupAutoRefresh();
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
  const { accountHolderName, routingNumber, accountNumber, bankName } = this.bankInfo;
  const routingValid = /^[0-9]{3,20}$/.test(routingNumber);

  return accountHolderName.trim() !== '' &&
         routingValid &&
         accountNumber.trim() !== '' &&
         bankName.trim() !== '';
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
      bankName: 'U.S.Bank',
      accountHolder: 'GGQU TRADE INC',
      routingNumber: '124302150',
      accountNumber: '1531 5537 8273',
      swiftCode: 'USBKUS44IMT',
      address: '110 16TH STREET SUITE 1460 DENVER, CO 80202'
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
    this.router.navigate(['/funding']);
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
}