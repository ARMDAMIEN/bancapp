import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { DocumentService } from '../../../services/document-service.service';
import { AdminDashboardService, UserDTO } from '../../../services/admin-dashboard.service';

// Ajoutez cette méthode dans votre admin.component.ts

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// Dans votre classe AdminComponent, ajoutez cette propriété

// Ajoutez aussi hasSigned dans votre interface User
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
  hasSigned?: boolean; // Ajoutez cette propriété
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
  
  // Modal de gestion des fonds
  showFundsModal: boolean = false;
  selectedUser: User | null = null;
  fundsAction: 'add' | 'remove' = 'add';
  fundsAmount: number = 0;
  fundsReason: string = '';
  isProcessing: boolean = false;
  
  // Modal de détails utilisateur
  showUserDetailsModal: boolean = false;
  selectedUserDetails: User | null = null;

  errorMessage : string = "";
  
  // Timer pour rafraîchissement automatique
  private refreshTimer: any;

  apiUrl : string  = environment.apiUrl;



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
        console.log(JSON.stringify(response))
        this.users = response.users.map(user => ({
          ...user,
          status: 'active' as const, // Vous devrez ajouter ce champ dans votre backend
          lastActivity: new Date(user.updatedAt)
        }));
        
        // Mettre à jour les statistiques avec les données réelles
        this.totalUsers = response.totalUsers;
        this.totalFunds = response.totalBalance;
        this.activeUsers = response.users.filter(u => u.accountBalance > 0).length;
        this.totalTransactions = response.users.length * 15; // Estimation
        
        this.filterUsers();
        this.saveUsersData(); // Sauvegarder pour le cache local
      },
      error: (error) => {
        console.error('Error loading users:', error);
        // Fallback vers les données locales en cas d'erreur
        this.loadLocalUsersData();
      }
    });
  }

  // Méthode de fallback pour charger les données locales
  private loadLocalUsersData(): void {
    const savedUsers = localStorage.getItem('adminUsersData');
    if (savedUsers) {
      this.users = JSON.parse(savedUsers).map((user: any) => ({
        ...user,
        lastActivity: new Date(user.lastActivity || user.updatedAt || user.createdAt)
      }));
    } else {
      this.users = this.generateSampleUsers();
      this.saveUsersData();
    }
    this.filterUsers();
  }

  // Génère des utilisateurs d'exemple avec le nouveau modèle
  private generateSampleUsers(): User[] {
    const firstNames = ['John', 'Sarah', 'Michael', 'Emma', 'David', 'Lisa', 'Robert', 'Maria', 'James', 'Anna', 'William', 'Sophie', 'Thomas', 'Elena', 'Daniel'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson'];
    const statuses: ('active' | 'inactive' | 'suspended')[] = ['active', 'active', 'active', 'active', 'inactive', 'suspended'];
    
    const users: User[] = [];
    const userCount = Math.floor(Math.random() * 25) + 15; // 15-40 users
    
    for (let i = 0; i < userCount; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const createdDate = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
      const hasDocuments = Math.random() > 0.3; // 70% ont des documents
      
      users.push({
        id: i + 1,
        firstName,
        lastName,
        ssn: `${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 90 + 10)}-${Math.floor(Math.random() * 9000 + 1000)}`,
        dateOfBirth: new Date(1970 + Math.floor(Math.random() * 35), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        companyName: `${firstName}'s ${['Tech', 'Solutions', 'Consulting', 'Services', 'Group'][Math.floor(Math.random() * 5)]}`,
        companyCreationDate: new Date(2010 + Math.floor(Math.random() * 14), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
        einNumber: `${Math.floor(Math.random() * 90 + 10)}-${Math.floor(Math.random() * 9000000 + 1000000)}`,
        createdAt: createdDate.toISOString(),
        updatedAt: new Date(createdDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        accountBalance: Math.floor(Math.random() * 50000) + 500,
        lastBalanceUpdate: new Date().toISOString(),
        status,
        lastActivity: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        
        // Documents RIB (optionnel)
        rib1Path: hasDocuments ? `uploads/ribs/${i + 1}/rib1_${Date.now()}.pdf` : undefined,
        rib2Path: hasDocuments ? `uploads/ribs/${i + 1}/rib2_${Date.now()}.pdf` : undefined,
        rib3Path: hasDocuments ? `uploads/ribs/${i + 1}/rib3_${Date.now()}.pdf` : undefined,
        documentsUploadDate: hasDocuments ? new Date().toISOString() : undefined
      });
    }
    
    return users.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
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
    
    this.filteredUsers = filtered;
    this.updatePagination();
  }

  // Met à jour la pagination
  private updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredUsers.length / this.usersPerPage);
    this.currentPage = Math.min(this.currentPage, this.totalPages || 1);
    
    const startIndex = (this.currentPage - 1) * this.usersPerPage;
    const endIndex = startIndex + this.usersPerPage;
    this.filteredUsers = this.filteredUsers.slice(startIndex, endIndex);
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

  // Ouvre la modal de gestion des fonds
  openFundsModal(user: User, action: 'add' | 'remove'): void {
    this.selectedUser = user;
    this.fundsAction = action;
    this.fundsAmount = 0;
    this.fundsReason = '';
    this.showFundsModal = true;
  }

  // Ferme la modal de gestion des fonds
  closeFundsModal(): void {
    if (!this.isProcessing) {
      this.showFundsModal = false;
      this.selectedUser = null;
      this.fundsAmount = 0;
      this.fundsReason = '';
    }
  }

  // Calcule le nouveau solde
  getNewBalance(): number {
    if (!this.selectedUser || !this.fundsAmount) return this.selectedUser?.accountBalance || 0;
    
    return this.fundsAction === 'add' 
      ? this.selectedUser.accountBalance + this.fundsAmount
      : this.selectedUser.accountBalance - this.fundsAmount;
  }

  // Détermine la classe CSS pour le nouveau solde
  getNewBalanceClass(): string {
    const newBalance = this.getNewBalance();
    if (newBalance < 0) return 'negative-balance';
    return this.getBalanceClass(newBalance);
  }

  // Valide la transaction
  isValidTransaction(): boolean {
    if (!this.selectedUser || !this.fundsAmount || this.fundsAmount <= 0) {
      return false;
    }
    
    if (this.fundsAction === 'remove') {
      return this.fundsAmount <= this.selectedUser.accountBalance;
    }
    
    return true;
  }

  // Traite la transaction de fonds via le backend
  processFundsTransaction(): void {
    if (!this.isValidTransaction() || !this.selectedUser) {
      return;
    }
    
    this.isProcessing = true;
    
    const operation = this.fundsAction === 'add' ? 'add' : 'subtract';
    
    this.adminService.updateUserBalance(this.selectedUser.id, this.fundsAmount, operation).subscribe({
      next: (response) => {
        if (this.selectedUser) {
          // Mettre à jour les données locales avec la réponse du serveur
          this.selectedUser.accountBalance = response.newBalance;
          this.selectedUser.lastBalanceUpdate = response.updatedAt;
          this.selectedUser.updatedAt = new Date().toISOString();
          this.selectedUser.lastActivity = new Date();
          
          // Mettre à jour dans la liste
          const userIndex = this.users.findIndex(u => u.id === this.selectedUser!.id);
          if (userIndex !== -1) {
            this.users[userIndex] = { ...this.selectedUser };
          }
          
          // Log de la transaction
          const transactionLog = {
            userId: this.selectedUser.id,
            action: this.fundsAction,
            amount: this.fundsAmount,
            oldBalance: response.oldBalance,
            newBalance: response.newBalance,
            reason: this.fundsReason || 'Admin adjustment',
            timestamp: new Date(),
            adminId: this.adminName
          };
          
          console.log('Transaction processed:', transactionLog);
          
          // Sauvegarder et rafraîchir
          this.saveUsersData();
          this.calculateStats();
          this.isProcessing = false;
          this.closeFundsModal();
          this.filterUsers();
          
          alert(`Successfully ${this.fundsAction === 'add' ? 'added' : 'removed'} €${this.fundsAmount.toFixed(2)} ${this.fundsAction === 'add' ? 'to' : 'from'} ${this.selectedUser.firstName} ${this.selectedUser.lastName}'s account.`);
        }
      },
      error: (error) => {
        console.error('Error processing transaction:', error);
        this.errorMessage = error.message || 'Failed to process transaction. Please try again.';
        this.isProcessing = false;
        alert('Transaction failed: ' + this.errorMessage);
      }
    });
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
      next: (blob) => {
        // Extraire le nom du fichier du chemin ou utiliser un nom par défaut
        const filename = documentPath!.split('/').pop() || `${documentType}_${user.firstName}_${user.lastName}.pdf`;
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
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

  // Obtient le montant maximum pour l'input
  getMaxAmount(): number | null {
    if (this.fundsAction === 'remove' && this.selectedUser) {
      return this.selectedUser.accountBalance;
    }
    return null;
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
}
