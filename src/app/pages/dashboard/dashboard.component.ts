import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FundingOption, FundingCategory, FUNDING_CATEGORIES } from '../../../interfaces/funding-categories';
import { StepService, FUNDING_STEPS, DASHBOARD_SUBSTEPS, DashboardSubstep } from '../../../services/step.service';
import { BankInfoService } from '../../../services/bank-info.service';
import { UserService, UserProfile } from '../../../services/user.service';
import { AdminBankingInfoService } from '../../../services/admin-banking-info.service';

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
  bankingOption?: BankingOption | null;
  message?: string;
}

interface BankingOption {
  id?: number;
  title: string;
  badge: string;
  type: string;
  amount: string;
  structure: string;
  payback: string;
  term: string;
  payment: string;
  frequency: string;
  delay: string;
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
  firstName: string = '';
  lastName: string = '';
  companyName: string = '';
  accountId: string = '';

  // Banking option from backend (when option 2 is selected)
  selectedBankingOption: BankingOption | null = null;

  // Informations de solde
  currentBalance: number = 0;
  lastUpdate: Date = new Date();
  
  // État de l'interface
  showWithdrawModal: boolean = false;
  showPaymentModal: boolean = false;
  isProcessing: boolean = false;
  isLoadingSelection: boolean = false;

  // Dashboard substep management
  currentSubstep: DashboardSubstep | undefined = undefined;
  
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
    private http: HttpClient,
    private stepService: StepService,
    private bankInfoService: BankInfoService,
    private userService: UserService,
    private adminBankingInfoService: AdminBankingInfoService
  ) {
    this.fundingCategories = FUNDING_CATEGORIES;
  }

  ngOnInit(): void {
    // Load step from backend first to ensure we have the latest state
    this.stepService.loadFromBackend().subscribe({
      next: () => {
        this.checkDashboardAccess();
        this.loadDashboardData();
      },
      error: (error) => {
        console.error('Failed to load current step:', error);
        // Use cached step as fallback
        this.checkDashboardAccess();
        this.loadDashboardData();
      }
    });
  }

  private checkDashboardAccess(): void {
    // Verify user is on DASHBOARD step
    const currentStep = this.stepService.getCurrentStep();

    // Allow access if user is at DASHBOARD or FUNDING_UNLOCKED (transition in progress)
    if (currentStep !== FUNDING_STEPS.DASHBOARD && currentStep !== FUNDING_STEPS.FUNDING_UNLOCKED) {
      console.warn('User not on dashboard step, redirecting...');
      // Redirect based on current step
      this.redirectToCurrentStep(currentStep);
      return;
    }

    // If user is at FUNDING_UNLOCKED, automatically transition to DASHBOARD
    if (currentStep === FUNDING_STEPS.FUNDING_UNLOCKED) {
      console.log('User at FUNDING_UNLOCKED, transitioning to DASHBOARD...');
      this.stepService.transitionTo(FUNDING_STEPS.DASHBOARD).subscribe({
        next: () => {
          console.log('Successfully transitioned to DASHBOARD');
          this.initializeSubstep();
        },
        error: (error) => {
          console.error('Failed to transition to DASHBOARD:', error);
          // Continue anyway, user has completed all required steps
          this.initializeSubstep();
        }
      });
      return;
    }

    // Load current substep
    this.currentSubstep = this.stepService.getCurrentSubstep();
    console.log('Dashboard loaded - Current substep:', this.currentSubstep);

    // If no substep set, initialize to WITHDRAWAL_AVAILABLE
    if (!this.currentSubstep) {
      this.initializeSubstep();
    }
  }

  private redirectToCurrentStep(currentStep: string): void {
    const stepRoutes: Record<string, string> = {
      [FUNDING_STEPS.FUNDING_INFO]: '/funding',
      [FUNDING_STEPS.AI_CALCULATING]: '/analyseOffer',
      [FUNDING_STEPS.HUMAN_VALIDATION_PENDING]: '/human-validation-pending',
      [FUNDING_STEPS.SELECT_OPTION]: '/analyseOffer',
      [FUNDING_STEPS.DOCUMENTS_SUPP]: '/documentSupp',
      [FUNDING_STEPS.SIGNATURE_REQUIRED]: '/signature-required',
      [FUNDING_STEPS.FUNDING_UNLOCKED]: '/funding-unlocked'
    };

    const route = stepRoutes[currentStep] || '/funding';
    this.router.navigate([route]);
  }

  private initializeSubstep(): void {
    // Set initial substep to WITHDRAWAL_AVAILABLE
    this.stepService.updateSubstep(DASHBOARD_SUBSTEPS.WITHDRAWAL_AVAILABLE).subscribe({
      next: () => {
        this.currentSubstep = DASHBOARD_SUBSTEPS.WITHDRAWAL_AVAILABLE;
        console.log('Substep initialized to WITHDRAWAL_AVAILABLE');
      },
      error: (error) => {
        console.error('Failed to initialize substep:', error);
        this.currentSubstep = DASHBOARD_SUBSTEPS.WITHDRAWAL_AVAILABLE;
      }
    });
  }

  ngOnDestroy(): void {
    this.cleanupTimers();
  }

  private loadDashboardData(): void {
    this.loadUserProfile();
    this.loadUserSelections();
    this.loadBankInfo();
    this.setupAutoRefresh();
  }

  private loadBankInfo(): void {
    this.bankInfoService.getBankInfo().subscribe({
      next: (response) => {
        if (this.bankInfoService.isBankInfo(response)) {
          this.bankInfo = {
            accountHolderName: response.accountHolderName,
            routingNumber: response.routingNumber,
            accountNumber: response.accountNumber,
            bankName: response.bankName
          };
          console.log('Bank info loaded from API:', this.bankInfo);
        } else {
          console.log('No bank info found:', response.message);
          // Keep default empty bankInfo
        }
      },
      error: (error) => {
        console.error('Error loading bank info from API:', error);
        // Keep default empty bankInfo
      }
    });
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
    console.log('📊 Handling user selection response:', response);

    let selectedOffer: string | null = null;

    if (response.selectedOffer) {
      selectedOffer = response.selectedOffer;
    } else if (response.selectedOffers && response.selectedOffers.length > 0) {
      selectedOffer = response.selectedOffers[0];
    }

    // Handle bankingOption if returned from backend (when option 2 is selected)
    if (response.bankingOption) {
      this.selectedBankingOption = response.bankingOption;
      console.log('💳 Banking option loaded from user selection response:', this.selectedBankingOption);

      // Update balance from banking option amount
      const amount = parseFloat(this.selectedBankingOption.amount.replace(/[^0-9.-]+/g, ''));
      if (!isNaN(amount)) {
        this.currentBalance = amount;
        console.log('💰 Balance updated from banking option:', this.currentBalance);
      }

      // Convert bankingOption to FundingOption format for display
      const paybackAmount = parseFloat(this.selectedBankingOption.payback.replace(/[^0-9.-]+/g, ''));
      this.selectedFundingOption = {
        title: this.selectedBankingOption.title,
        badge: this.selectedBankingOption.badge,
        type: this.selectedBankingOption.type,
        amount: amount,
        structure: this.selectedBankingOption.structure,
        payback: !isNaN(paybackAmount) ? paybackAmount : 0,
        term: this.selectedBankingOption.term,
        payment: this.selectedBankingOption.payment,
        frequency: this.selectedBankingOption.frequency,
        delay: this.selectedBankingOption.delay,
        features: []
      };
      console.log('✅ Selected funding option updated from banking option:', this.selectedFundingOption);
    }

    if (selectedOffer) {
      this.selectedOffer = selectedOffer;
      console.log('✅ Selected offer found:', selectedOffer);

      // Only parse if we don't have bankingOption (option 2 already handled above)
      if (!response.bankingOption) {
        this.parseSelectedOffer(selectedOffer);

        // Update balance from the selected option
        if (this.selectedFundingOption) {
          this.currentBalance = this.selectedFundingOption.amount;
          console.log('💰 Balance forced from selected option after parsing:', this.currentBalance);
        }
      } else {
        // Still need to parse to set selectedCategory and selectedOption for display
        const parts = selectedOffer.split('.');
        if (parts.length === 2) {
          this.selectedCategory = parseInt(parts[0], 10) - 1;
          this.selectedOption = parseInt(parts[1], 10) - 1;
        }
      }
    } else {
      console.log('❌ No selection found');
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
    // Don't update balance if we have a banking option (option 2 uses backend data)
    if (this.selectedBankingOption) {
        console.log('⏭️ Skipping balance update - using banking option amount instead');
        return;
    }

    if (this.selectedFundingOption) {
        this.currentBalance = this.selectedFundingOption.amount;
        console.log('✅ Balance updated from selected funding option:', this.currentBalance);
        this.saveBalance();
    } else {
        console.warn('⚠️ No selected funding option available to update balance');
    }
  }

  private loadUserProfile(): void {
    this.userService.getCurrentUserProfile().subscribe({
      next: (profile: UserProfile) => {
        this.firstName = profile.firstName || 'User';
        this.lastName = profile.lastName || '';
        this.companyName = profile.companyName || '';
        this.clientName = `${this.firstName} ${this.lastName}`.trim();

        // Only update balance from profile if we don't have a selected funding option
        // The selected funding option balance takes priority
        if (!this.selectedFundingOption) {
          if (profile.accountBalance !== null && profile.accountBalance !== undefined) {
            this.currentBalance = profile.accountBalance;
            console.log('Balance set from user profile:', this.currentBalance);
          }
        } else {
          console.log('Balance from selected option takes priority, skipping profile balance');
        }

        // Update last update time if available
        if (profile.lastBalanceUpdate) {
          this.lastUpdate = new Date(profile.lastBalanceUpdate);
        }

        console.log('User profile loaded:', profile);
      },
      error: (error) => {
        console.error('Error loading user profile:', error);
        // Fallback to localStorage if API fails
        const firstName = localStorage.getItem('firstName') || 'User';
        const lastName = localStorage.getItem('lastName') || '';
        this.firstName = firstName;
        this.lastName = lastName;
        this.clientName = `${firstName} ${lastName}`.trim();
      }
    });

    this.accountId = localStorage.getItem('accountId') || this.generateRandomId(6);
  }

  private loadAdminBankingInfo(): void {
    this.adminBankingInfoService.getAdminBankingInfo().subscribe({
      next: (response) => {
        if (this.adminBankingInfoService.isAdminBankingInfo(response)) {
          // Set admin banking info for payment
          this.paymentBankInfo = {
            bankName: response.bankName,
            accountHolder: response.accountHolderName,
            routingNumber: response.routingNumber,
            accountNumber: response.accountNumber,
            swiftCode: '', // Admin banking info doesn't have swift code
            address: '' // Admin banking info doesn't have address
          };
          console.log('Admin banking info loaded for payment:', this.paymentBankInfo);
        } else {
          console.log('No admin banking info found, using default');
          // Fallback to default if no admin banking info exists
          this.setDefaultPaymentBankInfo();
        }
      },
      error: (error) => {
        console.error('Error loading admin banking info:', error);
        // Fallback to default if API fails
        this.setDefaultPaymentBankInfo();
      }
    });
  }

  private setDefaultPaymentBankInfo(): void {
    this.paymentBankInfo = {
      bankName: 'U.S.Bank',
      accountHolder: 'GGQU TRADE INC',
      routingNumber: '124302150',
      accountNumber: '1531 5537 8273',
      swiftCode: 'USBKUS44IMT',
      address: '110 16TH STREET SUITE 1460 DENVER, CO 80202'
    };
  }

  private generateRandomId(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
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
    // Check if we can withdraw based on substep
    if (!this.canWithdraw()) {
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

    this.stepService.updateSubstep(DASHBOARD_SUBSTEPS.PAYMENT_PENDING).subscribe({
      next: () => {
        console.log('Substep transitioned to PAYMENT_PENDING');
        this.currentSubstep = DASHBOARD_SUBSTEPS.PAYMENT_PENDING;

        setTimeout(() => {
          const withdrawalAmount = this.currentBalance;

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

          // Stay on dashboard to show payment pending status
          // Admin will later transition user to WITHDRAWAL_PENDING when payment is received
        }, 2500);
      },
      error: (error) => {
        console.error('Failed to update substep:', error);
        this.isProcessing = false;
        alert('Failed to process payment. Please try again.');
      }
    });
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
    if (this.currentBalance <= 0 || this.isProcessing || !this.bankInfo.accountHolderName) {
      return;
    }

    this.loadAdminBankingInfo();

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
      'accountId'
    ];

    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Clear step state
    this.stepService.clearState();

    this.router.navigate(['/sign-in']);
  }

  refreshAccountData(): void {
    this.loadUserSelections();
    this.lastUpdate = new Date();
  }

  canWithdraw(): boolean {
    // Can only withdraw if:
    // 1. Has selected offer
    // 2. On WITHDRAWAL_AVAILABLE substep
    // 3. Has balance and not processing
    return this.hasUserSelection() &&
           this.currentSubstep === DASHBOARD_SUBSTEPS.WITHDRAWAL_AVAILABLE &&
           this.currentBalance > 0 &&
           !this.isProcessing;
  }

  getWithdrawButtonText(): string {
    if (!this.hasUserSelection()) {
      return 'No Offer Selected';
    }
    if (this.currentSubstep === DASHBOARD_SUBSTEPS.PAYMENT_PENDING) {
      return 'Payment Pending';
    }
    if (this.currentSubstep === DASHBOARD_SUBSTEPS.WITHDRAWAL_PENDING) {
      return 'Withdrawal Pending';
    }
    if (this.currentSubstep === DASHBOARD_SUBSTEPS.SUSPENDED) {
      return 'Account Suspended';
    }
    if (this.currentBalance <= 0) {
      return 'No Funds Available';
    }
    return 'Withdraw Funds';
  }

  // Check if in specific substep states
  isPaymentPending(): boolean {
    return this.currentSubstep === DASHBOARD_SUBSTEPS.PAYMENT_PENDING;
  }

  isWithdrawalPending(): boolean {
    return this.currentSubstep === DASHBOARD_SUBSTEPS.WITHDRAWAL_PENDING;
  }

  isAccountSuspended(): boolean {
    return this.currentSubstep === DASHBOARD_SUBSTEPS.SUSPENDED;
  }

  cancelWithdrawal(): void {
    // Transition back to WITHDRAWAL_AVAILABLE substep
    this.stepService.updateSubstep(DASHBOARD_SUBSTEPS.WITHDRAWAL_AVAILABLE).subscribe({
      next: () => {
        console.log('Substep transitioned back to WITHDRAWAL_AVAILABLE');
        this.currentSubstep = DASHBOARD_SUBSTEPS.WITHDRAWAL_AVAILABLE;
      },
      error: (error) => {
        console.error('Failed to cancel withdrawal:', error);
      }
    });
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