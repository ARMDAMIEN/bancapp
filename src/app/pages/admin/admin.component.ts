import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { DocumentService } from '../../../services/document-service.service';
import { AdminDashboardService, UserDTO } from '../../../services/admin-dashboard.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FundingCategory, FUNDING_CATEGORIES } from '../../../interfaces/funding-categories';
interface BankingOption {
  id?: number;
  userId: number;
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

interface User {
  id: number;
  firstName: string;
  lastName: string;
  ssn: string;
  dateOfBirth: string;
  email: string;
  companyName?: string;
  companyCreationDate?: string;
  einNumber?: string;
  createdAt: string;
  updatedAt: string;
  rib1Path?: string;
  rib2Path?: string;
  rib3Path?: string;
  driverLicensePath?: string;
  voidedCheckPath?: string;
  documentsUploadDate?: string;
  accountBalance: number;
  lastBalanceUpdate?: string;
  status: 'active' | 'inactive' | 'suspended';
  lastActivity: Date;
  hasSigned?: boolean;
  bankingOption?: BankingOption | null;
  currentStep?: string;
  currentSubstep?: string;
  selectedOffer?: string;
}

type DocumentType = 'rib1' | 'rib2' | 'rib3' | 'driverLicense' | 'voidedCheck';


@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit, OnDestroy {
  // Données administrateur
  adminName: string = '';
  
  // Statistiques générales
  totalUsers: number = 0;
  totalFunds: number = 0;
  activeUsers: number = 0;
  totalTransactions: number = 0;
  
  // Gestion des utilisateurs
  users: User[] = [];
  filteredUsers: User[] = [];
  searchTerm: string = '';
  filterStatus: string = '';
  
  // Pagination
  currentPage: number = 1;
  usersPerPage: number = 10;
  totalPages: number = 1;
  
  // Modal de détails utilisateur
  showUserDetailsModal: boolean = false;
  selectedUserDetails: User | null = null;

  // Bank Info Modal
  showBankInfoModal: boolean = false;
  selectedBankInfoUser: User | null = null;

  errorMessage : string = "";

  // Timer pour rafraîchissement automatique
  private refreshTimer: any;

  apiUrl : string  = environment.apiUrl;

  // Funding Options Modal
  showFundingOptionsModal: boolean = false;
  selectedFundingUser: User | null = null;
  fundingCategories: FundingCategory[] = FUNDING_CATEGORIES;
  customBankingOption: any = {};
  isSavingFundingOptions: boolean = false;



  constructor(
    private router: Router,
    private documentService: DocumentService,
    private adminService: AdminDashboardService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadAdminProfile();
    this.loadUsersData();
    this.calculateStats();
    this.setupAutoRefresh();
  }

  // Load banking options for all users
  private loadBankingOptionsForUsers(): void {
    this.users.forEach(user => {
      this.loadBankingOptionForUser(user.id);
    });
  }

  // Load banking option for a specific user
  private loadBankingOptionForUser(userId: number): void {
    this.http.get<any>(`${this.apiUrl}/banking-options/admin/user/${userId}`).subscribe({
      next: (response) => {
        // If response has a message property, it means no banking option exists
        if (response.message) {
          console.log(`No banking option for user ${userId}`);
          const userIndex = this.users.findIndex(u => u.id === userId);
          if (userIndex !== -1) {
            this.users[userIndex].bankingOption = null;
          }
        } else {
          // Banking option exists
          console.log(`Banking option loaded for user ${userId}:`, response);
          const userIndex = this.users.findIndex(u => u.id === userId);
          if (userIndex !== -1) {
            this.users[userIndex].bankingOption = response;
          }
        }
        this.filterUsers();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error(`Error loading banking option for user ${userId}:`, error);
      }
    });
  }

  ngOnDestroy(): void {
    this.cleanupTimers();
  }

  // Charge le profil administrateur
  private loadAdminProfile(): void {
    const firstName = localStorage.getItem('firstName') || 'Admin';
    const lastName = localStorage.getItem('lastName') || 'User';
    this.adminName = `${firstName} ${lastName}`.trim();
  }

  // Charge les données utilisateurs depuis le backend
  private loadUsersData(): void {
    this.adminService.getAllUsers().subscribe({
      next: (response) => {
        console.log('[DEBUG] Users loaded from backend:', response);
        this.users = response.users.map(user => {
          const lastActivityDate = user.updatedAt ? new Date(user.updatedAt) : new Date();
          return {
            ...user,
            status: 'active' as const,
            lastActivity: isNaN(lastActivityDate.getTime()) ? new Date() : lastActivityDate
          };
        });

        console.log('[DEBUG] Mapped users:', this.users.length);

        // Mettre à jour les statistiques avec les données réelles
        this.totalUsers = response.totalUsers;
        this.totalFunds = response.totalBalance;
        this.activeUsers = response.users.filter(u => u.accountBalance > 0).length;
        this.totalTransactions = response.users.length * 15; // Estimation

        this.filterUsers();
        this.saveUsersData(); // Sauvegarder pour le cache local

        console.log('[DEBUG] Filtered users:', this.filteredUsers.length);

        // Load banking options for all users
        this.loadBankingOptionsForUsers();

        // Force change detection after data is loaded
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading users:', error);
        // Fallback vers les données locales en cas d'erreur
        this.loadLocalUsersData();
        this.cdr.detectChanges();
      }
    });
  }

  // Méthode de fallback pour charger les données locales
  private loadLocalUsersData(): void {
    const savedUsers = localStorage.getItem('adminUsersData');
    if (savedUsers) {
      this.users = JSON.parse(savedUsers).map((user: any) => {
        const activityDate = new Date(user.lastActivity || user.updatedAt || user.createdAt);
        return {
          ...user,
          lastActivity: isNaN(activityDate.getTime()) ? new Date() : activityDate
        };
      });
    } 
    this.filterUsers();

    // Force change detection
    this.cdr.detectChanges();
  }


  // Calcule les statistiques
  private calculateStats(): void {
    this.totalUsers = this.users.length;
    this.activeUsers = this.users.filter(user => user.status === 'active').length;
    this.totalFunds = this.users.reduce((sum, user) => sum + user.accountBalance, 0);
    this.totalTransactions = this.users.length * Math.floor(Math.random() * 20 + 5);
  }

  // Configure le rafraîchissement automatique
  private setupAutoRefresh(): void {
    this.refreshTimer = setInterval(() => {
      this.calculateStats();
    }, 30000);
  }

  // Nettoie les timers
  private cleanupTimers(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  // Sauvegarde les données utilisateurs
  private saveUsersData(): void {
    localStorage.setItem('adminUsersData', JSON.stringify(this.users));
  }

  // Filtre les utilisateurs selon les critères
  filterUsers(): void {
    let filtered = [...this.users];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(user =>
        user.firstName.toLowerCase().includes(term) ||
        user.lastName.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.id.toString().includes(term) ||
        user.ssn.includes(term) ||
        (user.companyName && user.companyName.toLowerCase().includes(term)) ||
        (user.einNumber && user.einNumber.includes(term))
      );
    }

    if (this.filterStatus) {
      filtered = filtered.filter(user => user.status === this.filterStatus);
    }

    this.updatePagination(filtered);
  }

  // Met à jour la pagination
  private updatePagination(filtered: User[]): void {
    this.totalPages = Math.ceil(filtered.length / this.usersPerPage);
    this.currentPage = Math.min(this.currentPage, this.totalPages || 1);

    const startIndex = (this.currentPage - 1) * this.usersPerPage;
    const endIndex = startIndex + this.usersPerPage;
    this.filteredUsers = filtered.slice(startIndex, endIndex);
  }

  // Change de page
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.filterUsers();
    }
  }

  // Détermine la classe CSS pour le solde
  getBalanceClass(balance: number): string {
    if (balance >= 20000) return 'high-balance';
    if (balance >= 5000) return 'medium-balance';
    return 'low-balance';
  }

  // Opens bank info modal
  openBankInfoModal(user: User): void {
    this.selectedBankInfoUser = user;
    this.showBankInfoModal = true;
  }

  // Closes bank info modal
  closeBankInfoModal(): void {
    this.showBankInfoModal = false;
    this.selectedBankInfoUser = null;
  }

  // Handles bank info saved event
  onBankInfoSaved(bankInfo: any): void {
    console.log('Bank info saved successfully:', bankInfo);
    // Optionally show a success notification
    // No need to reload entire user list for bank info changes
  }

  // Affiche les détails complets d'un utilisateur
  viewUserDetails(user: User): void {
    this.selectedUserDetails = { ...user }; // Clone pour éviter les références
    
    // Forcer la mise à jour immédiate
    setTimeout(() => {
      this.showUserDetailsModal = true;
      this.cdr.detectChanges(); // Force Angular à détecter les changements
    }, 0);
  }

  // Ferme la modal de détails
  closeUserDetailsModal(): void {
    this.showUserDetailsModal = false;
    setTimeout(() => {
      this.selectedUserDetails = null;
      this.cdr.detectChanges();
    }, 150);
  }

  // Vérifie si l'utilisateur a des documents RIB
  hasDocuments(user: User): boolean {
    return !!(user.rib1Path || user.rib2Path || user.rib3Path);
  }

  // Télécharge un document RIB
  downloadDocument(user: User, documentType: DocumentType): void {
  let documentPath: string | undefined = undefined;

  // Récupérer le chemin du document selon le type
  switch (documentType) {
    case 'rib1':
      documentPath = user.rib1Path;
      break;
    case 'rib2':
      documentPath = user.rib2Path;
      break;
    case 'rib3':
      documentPath = user.rib3Path;
      break;
    case 'driverLicense':
      documentPath = user.driverLicensePath;
      break;
    case 'voidedCheck':
      documentPath = user.voidedCheckPath;
      break;
    default:
      alert('Invalid document type');
      return;
  }

  if (documentPath) {
    this.documentService.downloadDocument(user.id, documentType).subscribe({
      next: (response) => {
        // Backend now returns a presigned S3 URL - open it in a new tab to download
        window.open(response.downloadUrl, '_blank');
      },
      error: (error) => {
        console.error('Download failed:', error);
        let errorMessage = 'Failed to download document';

        if (error.message) {
          if (error.message.includes('not found')) {
            errorMessage = 'Document not found or has been removed';
          } else {
            errorMessage = `Download failed: ${error.message}`;
          }
        }

        alert(errorMessage);
      }
    });
  } else {
    const documentNames = {
      rib1: 'RIB Month 1',
      rib2: 'RIB Month 2',
      rib3: 'RIB Month 3',
      driverLicense: 'Driver License',
      voidedCheck: 'Voided Check'
    };

    alert(`No ${documentNames[documentType]} document available for this user`);
  }
}

// Méthodes helper pour vérifier l'existence des documents
hasRibDocuments(user: User): boolean {
  return !!(user.rib1Path || user.rib2Path || user.rib3Path);
}

hasIdentityDocuments(user: User): boolean {
  return !!(user.driverLicensePath || user.voidedCheckPath);
}

hasAnyDocuments(user: User): boolean {
  return this.hasRibDocuments(user) || this.hasIdentityDocuments(user);
}

  // Calcule l'âge de l'utilisateur
  calculateAge(dateOfBirth: string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  // Calcule l'ancienneté de l'entreprise
  calculateCompanyAge(companyCreationDate?: string): number | null {
    if (!companyCreationDate) return null;
    
    const today = new Date();
    const creationDate = new Date(companyCreationDate);
    return today.getFullYear() - creationDate.getFullYear();
  }

  // Formate le SSN pour l'affichage
  formatSSN(ssn: string): string {
    return ssn.replace(/(\d{3})(\d{2})(\d{4})/, '***-**-$3');
  }

  // Vérifie et retourne une date valide
  getValidDate(date: any): Date {
    if (!date) return new Date();
    const d = date instanceof Date ? date : new Date(date);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  // Convertit une date backend en format valide pour Angular date pipe
  formatBackendDate(dateValue: any): Date | null {
    if (!dateValue) return null;

    // Si c'est déjà une Date valide
    if (dateValue instanceof Date) {
      return isNaN(dateValue.getTime()) ? null : dateValue;
    }

    // Si c'est un string au format "2025,9,27,14,17,42"
    if (typeof dateValue === 'string' && dateValue.includes(',')) {
      const parts = dateValue.split(',').map(p => parseInt(p.trim()));
      if (parts.length >= 6) {
        // new Date(year, monthIndex, day, hours, minutes, seconds)
        return new Date(parts[0], parts[1], parts[2], parts[3], parts[4], parts[5]);
      }
    }

    // Sinon, essayer de parser comme date standard
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  // Déconnexion administrateur
  logout(): void {
    const keysToRemove = [
      'token',
      'userRole',
      'firstName',
      'lastName',
      'adminUsersData'
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    this.router.navigate(['/sign-in']);
  }

  // Exporte les données utilisateurs (CSV)
  exportUsersData(): void {
    const csvData = this.convertToCSV(this.users);
    this.downloadCSV(csvData, 'users-data.csv');
  }

  // Convertit en CSV avec toutes les données
  private convertToCSV(data: User[]): string {
    const headers = [
      'ID', 'First Name', 'Last Name', 'Email', 'SSN', 'Date of Birth', 'Age',
      'Company Name', 'Company Creation Date', 'EIN Number', 
      'Account Balance', 'Status', 'Has Documents', 'Created At', 'Last Activity'
    ];
    const csvRows = [headers.join(',')];
    
    data.forEach(user => {
      const row = [
        user.id.toString(),
        user.firstName,
        user.lastName,
        user.email,
        this.formatSSN(user.ssn),
        user.dateOfBirth,
        this.calculateAge(user.dateOfBirth).toString(),
        user.companyName || '',
        user.companyCreationDate || '',
        user.einNumber || '',
        user.accountBalance.toString(),
        user.status,
        this.hasDocuments(user) ? 'Yes' : 'No',
        user.createdAt,
        user.lastActivity.toISOString()
      ];
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  }

  // Télécharge le CSV
  private downloadCSV(csvData: string, filename: string): void {
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // Rafraîchit manuellement les données depuis le backend
  refreshData(): void {
    this.loadUsersData(); // Rechargera depuis le backend
  }

  // Charge les statistiques depuis le backend
  loadStatsFromBackend(): void {
    this.adminService.getFormattedStats().subscribe({
      next: (stats) => {
        this.totalUsers = stats.totalUsers;
        this.totalFunds = stats.totalFunds;
        this.activeUsers = stats.activeUsers;
        this.totalTransactions = stats.totalTransactions;
      },
      error: (error) => {
        console.error('Error loading stats:', error);
        // Utiliser les statistiques calculées localement en cas d'erreur
        this.calculateStats();
      }
    });
  }

  // Statistiques rapides
  getActiveUsersPercentage(): number {
    return this.totalUsers > 0 ? Math.round((this.activeUsers / this.totalUsers) * 100) : 0;
  }

  getAverageBalance(): number {
    return this.totalUsers > 0 ? this.totalFunds / this.totalUsers : 0;
  }


  // Getter qui se recalcule automatiquement
  get selectedUserHasDocuments(): boolean {
    return this.selectedUserDetails ? this.hasDocuments(this.selectedUserDetails) : false;
  }

  // Getter pour les documents du user sélectionné
  get selectedUserDocuments() {
    if (!this.selectedUserDetails) return { rib1: false, rib2: false, rib3: false };
    
    return {
      rib1: !!this.selectedUserDetails.rib1Path,
      rib2: !!this.selectedUserDetails.rib2Path,
      rib3: !!this.selectedUserDetails.rib3Path
    };
  }

  setUserSignature(user: User): void {
  if (user.hasSigned) {
    alert(`${user.firstName} ${user.lastName} has already signed the contract.`);
    return;
  }

  // Confirmation avant de procéder
  const confirmMessage = `Are you sure you want to mark ${user.firstName} ${user.lastName}'s contract as signed?`;
  
  if (!confirm(confirmMessage)) {
    return;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    alert('Authentication token not found. Please log in again.');
    return;
  }

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  // Appel à l'endpoint POST /api/signature/sign pour l'utilisateur
  this.http.post<any>(
    `${this.apiUrl}/api/signature/sign`, 
    {},
    { headers }
  ).subscribe({
    next: (response) => {
      console.log('Signature marked successfully:', response);
      
      // Mettre à jour localement
      user.hasSigned = true;
      
      // Mettre à jour dans la liste principale
      const userIndex = this.users.findIndex(u => u.id === user.id);
      if (userIndex !== -1) {
        this.users[userIndex].hasSigned = true;
      }
      
      // Sauvegarder les changements
      this.saveUsersData();
      
      // Rafraîchir l'affichage
      this.filterUsers();
      
      alert(`Contract successfully marked as signed for ${user.firstName} ${user.lastName}!`);
    },
    error: (error) => {
      console.error('Error setting signature:', error);
      
      let errorMessage = 'Failed to mark contract as signed.';
      if (error.error?.message) {
        errorMessage += ` ${error.error.message}`;
      }
      
      alert(errorMessage);
    }
  });
}

// Alternative: Si vous voulez un endpoint admin spécifique qui permet de signer pour n'importe quel utilisateur
setUserSignatureAsAdmin(user: User): void {
  if (user.hasSigned) {
    alert(`${user.firstName} ${user.lastName} has already signed the contract.`);
    return;
  }

  const confirmMessage = `Are you sure you want to mark ${user.firstName} ${user.lastName}'s contract as signed?`;
  
  if (!confirm(confirmMessage)) {
    return;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    alert('Authentication token not found. Please log in again.');
    return;
  }

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  // Si vous créez un endpoint admin spécifique: POST /api/admin/users/{userId}/signature
  this.http.post<any>(
    `${this.apiUrl}/api/signature/admin/users/${user.id}/signature`, 
    {},
    { headers }
  ).subscribe({
    next: (response) => {
      console.log('Signature marked successfully:', response);
      
      user.hasSigned = true;
      
      const userIndex = this.users.findIndex(u => u.id === user.id);
      if (userIndex !== -1) {
        this.users[userIndex].hasSigned = true;
      }
      
      this.saveUsersData();
      this.filterUsers();
      
      alert(`Contract successfully marked as signed for ${user.firstName} ${user.lastName}!`);
    },
    error: (error) => {
      console.error('Error setting signature:', error);
      
      let errorMessage = 'Failed to mark contract as signed.';
      if (error.error?.message) {
        errorMessage += ` ${error.error.message}`;
      }
      
      alert(errorMessage);
    }
  });
}

// Funding Options Modal methods
openFundingOptionsModal(user: User): void {
  this.selectedFundingUser = user;

  // Check if user has existing banking option and pre-fill form
  if (user.bankingOption) {
    console.log('Pre-filling form with existing banking option:', user.bankingOption);
    this.customBankingOption = {
      title: user.bankingOption.title || '',
      badge: user.bankingOption.badge || '',
      type: user.bankingOption.type || 'guarantee',
      amount: parseFloat(user.bankingOption.amount) || 0,
      structure: user.bankingOption.structure || '',
      payback: parseFloat(user.bankingOption.payback) || 0,
      term: user.bankingOption.term || '',
      payment: user.bankingOption.payment || '',
      frequency: user.bankingOption.frequency || 'Monthly',
      delay: user.bankingOption.delay || ''
    };
  } else {
    // Initialize custom banking option with default values
    this.customBankingOption = {
      title: '',
      badge: '',
      type: 'guarantee',
      amount: 0,
      structure: '',
      payback: 0,
      term: '',
      payment: '',
      frequency: 'Monthly',
      delay: ''
    };
  }

  this.showFundingOptionsModal = true;
}

closeFundingOptionsModal(): void {
  if (!this.isSavingFundingOptions) {
    this.showFundingOptionsModal = false;
    this.selectedFundingUser = null;
    this.customBankingOption = {};
  }
}

isSingleFormValid(): boolean {
  return !!(
    this.customBankingOption &&
    this.customBankingOption.title &&
    this.customBankingOption.badge &&
    this.customBankingOption.type &&
    this.customBankingOption.amount > 0 &&
    this.customBankingOption.structure &&
    this.customBankingOption.payback >= 0 &&
    this.customBankingOption.term &&
    this.customBankingOption.payment &&
    this.customBankingOption.frequency &&
    this.customBankingOption.delay
  );
}

saveFundingOptions(): void {
  if (!this.selectedFundingUser || !this.isSingleFormValid()) {
    console.warn('[DEBUG] No user selected or form not valid');
    return;
  }

  console.log('[DEBUG] Starting saveFundingOptions for user:', this.selectedFundingUser);
  console.log('[DEBUG] Custom banking option:', this.customBankingOption);

  this.isSavingFundingOptions = true;

  // Build single BankingOptionDTO object
  const dto = {
    userId: this.selectedFundingUser!.id,
    title: this.customBankingOption.title,
    badge: this.customBankingOption.badge,
    type: this.customBankingOption.type,
    amount: this.customBankingOption.amount.toString(),
    structure: this.customBankingOption.structure,
    payback: this.customBankingOption.payback.toString(),
    term: this.customBankingOption.term,
    payment: this.customBankingOption.payment,
    frequency: this.customBankingOption.frequency,
    delay: this.customBankingOption.delay
  };

  console.log('[DEBUG] Created BankingOptionDTO:', dto);

  const url = `${this.apiUrl}/banking-options/saveBankingOption`;
  console.log('[DEBUG] Sending request to:', url);
  console.log('[DEBUG] Request payload:', dto);

  this.http.post<any>(url, dto).subscribe({
    next: (response) => {
      console.log('[DEBUG] Response:', response);
      this.isSavingFundingOptions = false;

      // Reload the banking option for this user to update the UI
      this.loadBankingOptionForUser(this.selectedFundingUser!.id);

      alert(`Funding option saved successfully for ${this.selectedFundingUser!.firstName} ${this.selectedFundingUser!.lastName}!`);

      this.closeFundingOptionsModal();
    },
    error: (error) => {
      console.error('[DEBUG] Error saving banking option:', error);
      console.error('[DEBUG] Error details:', {
        status: error.status,
        statusText: error.statusText,
        error: error.error,
        message: error.message
      });

      let errorMessage = 'Failed to save funding option.';
      if (error.error?.message) {
        errorMessage += ` ${error.error.message}`;
      }

      this.isSavingFundingOptions = false;
      alert(errorMessage);
    }
  });
}

/**
 * Update user substep from PAYMENT_PENDING to WITHDRAWAL_PENDING
 * This should be called after admin confirms payment has been received
 */
updateUserSubstep(user: User, newSubstep: string): void {
  const confirmMessage = `Are you sure you want to update ${user.firstName} ${user.lastName}'s status to ${newSubstep.replace('_', ' ').toUpperCase()}?`;

  if (!confirm(confirmMessage)) {
    return;
  }

  const url = `${this.apiUrl}/api/steps/substep/user/${user.id}`;
  const payload = { substep: newSubstep };

  console.log('[DEBUG] Updating substep for user:', user.id);
  console.log('[DEBUG] New substep:', newSubstep);

  this.http.post<any>(url, payload).subscribe({
    next: (response) => {
      console.log('[DEBUG] Substep updated successfully:', response);
      alert(`User substep updated to ${newSubstep.replace('_', ' ').toUpperCase()} successfully!`);

      // Optionally refresh user data
      this.loadUsersData();
    },
    error: (error) => {
      console.error('[DEBUG] Error updating substep:', error);

      let errorMessage = 'Failed to update user substep.';
      if (error.error?.message) {
        errorMessage += ` ${error.error.message}`;
      }

      alert(errorMessage);
    }
  });
}

/**
 * Confirm payment received and transition user to WITHDRAWAL_PENDING
 */
confirmPaymentReceived(user: User): void {
  this.updateUserSubstep(user, 'withdrawal_pending');
}

/**
 * Mark withdrawal as complete and return user to WITHDRAWAL_AVAILABLE
 */
completeWithdrawal(user: User): void {
  this.updateUserSubstep(user, 'withdrawal_available');
}

/**
 * Suspend user account
 */
suspendUser(user: User): void {
  this.updateUserSubstep(user, 'suspended');
}

/**
 * Unsuspend user account and return to WITHDRAWAL_AVAILABLE
 */
unsuspendUser(user: User): void {
  this.updateUserSubstep(user, 'withdrawal_available');
}

/**
 * Format substep for display
 */
formatSubstep(substep: string): string {
  if (!substep) return '-';

  // Convert snake_case to Title Case
  return substep
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format selected offer for display
 * Converts "1.2" to "Recommended #2" or "2.3" to "Popular #3"
 */
formatOffer(offer: string): string {
  if (!offer) return 'No offer';

  const parts = offer.split('.');
  if (parts.length !== 2) return offer;

  const categoryIndex = parseInt(parts[0], 10) - 1;
  const optionIndex = parseInt(parts[1], 10);

  if (categoryIndex >= 0 && categoryIndex < this.fundingCategories.length) {
    const category = this.fundingCategories[categoryIndex];
    return `${category.title} #${optionIndex}`;
  }

  return offer;
}
}
