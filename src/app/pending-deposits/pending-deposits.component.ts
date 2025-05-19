import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { WithdrawDTO } from '../../interfaces/withdraw-dto';
import { WithdrawService } from '../../services/withdrawal.service';

// Service
export interface UserData {
  walletNetwork: string;
  walletAddress: string;
  confirmWalletOwnership: boolean;
  transactionId: string;
  depositAmount: number;
  confirmDeposit: boolean;
}

export interface DepositDTO {
  id: number;
  userId: number;
  walletNetwork: string;
  walletAddress: string;
  confirmWalletOwnership: boolean;
  transactionId: string;
  depositAmount: number;
  confirmDeposit: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountDTO {
  email: string;
  password: string;
  firstname: string;
  lastname: string;
  subscription: string;
  creationDate: Date;
  address: string;
  phoneNumber: string;
}


// Composant
@Component({
  selector: 'app-pending-deposits',
  templateUrl: './pending-deposits.component.html',
  styleUrls: ['./pending-deposits.component.scss']
})
export class PendingDepositsComponent implements OnInit {
  // Liste des dépôts et des utilisateurs
  pendingDeposits: DepositDTO[] = [];
  filteredDeposits: DepositDTO[] = [];
  usersCache: { [key: number]: AccountDTO } = {};

  // Liste des withdraws
  withdrawals: WithdrawDTO[] = [];
  selectedWithdrawal: WithdrawDTO | null = null;
  filteredWithdrawals : WithdrawDTO[] = [];

  // Pagination pour les retraits
  withdrawalCurrentPage: number = 1;
  withdrawalTotalPages: number = 1;
  withdrawalsPerPage: number = 10;

  // Gestion du dépôt sélectionné dans le modal
  selectedDeposit: DepositDTO | null = null;
  selectedUser: AccountDTO | null = null;

  // Filtres
  searchTerm: string = '';
  statusFilter: string = 'all';
  networkFilter: string = 'all';

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;

  // États
  isLoading: boolean = false;
  isProcessing: boolean = false;
  errorMessage: string = '';
  message: string = '';

  //Tabs
  activeTab: string = 'deposits';

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private withdrawalService: WithdrawService) { }

  ngOnInit(): void {
    this.loadDeposits();
    this.loadWithdrawals();
  }

  // Charger la liste des dépôts
  loadDeposits(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.http.get<DepositDTO[]>(`${this.apiUrl}/getAllDeposits`)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (deposits) => {
          this.pendingDeposits = deposits;
          this.applyFilters();
          this.calculateTotalPages();
        },
        error: (error) => {
          console.error('Error loading deposits:', error);
          this.errorMessage = 'Failed to load deposits. Please try again.';
        }
      });
  }

  loadWithdrawals() {
    this.isLoading = true;

    this.withdrawalService.getWithdraws().subscribe({
      next: (data) => {
        this.withdrawals = data;
        this.applyWithdrawalFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading withdrawals', error);
        this.isLoading = false;
      }
    });
  }

  // Appliquer les filtres aux retraits (similaire à applyFilters pour les dépôts)
  applyWithdrawalFilters() {
    // Filtrer les retraits selon les critères (si vous ajoutez des filtres)
    this.filteredWithdrawals = [...this.withdrawals];

    // Paginination
    this.withdrawalTotalPages = Math.ceil(this.filteredWithdrawals.length / this.withdrawalsPerPage);

    // Appliquer la pagination
    const startIndex = (this.withdrawalCurrentPage - 1) * this.withdrawalsPerPage;
    this.filteredWithdrawals = this.filteredWithdrawals.slice(startIndex, startIndex + this.withdrawalsPerPage);
  }

  // Navigation entre les pages de retraits
  goToWithdrawalPage(page: number) {
    this.withdrawalCurrentPage = page;
    this.applyWithdrawalFilters();
  }

  // Approuver un retrait
  approveWithdrawal(withdrawal: any) {
    this.isProcessing = true;

    this.withdrawalService.completeWithdraw(withdrawal.id).subscribe({
      next: () => {
        // Mettre à jour le retrait dans la liste
        withdrawal.completed = true;
        withdrawal.completedAt = new Date();

        this.isProcessing = false;
        // Notification de succès
      },
      error: (error) => {
        console.error('Error completing withdrawal', error);
        this.isProcessing = false;
        // Notification d'erreur
      }
    });
  }

  // Afficher les détails d'un retrait
  viewWithdrawalDetails(withdrawal: any) {
    this.selectedWithdrawal = withdrawal;
  }

  // Fermer les détails du retrait
  closeWithdrawalDetails() {
    this.selectedWithdrawal = null;
  }

  // Rafraîchir la liste des dépôts
  refreshDeposits(): void {
    this.loadDeposits();
  }

  // Appliquer les filtres sur la liste des dépôts
  applyFilters(): void {
    let filtered = [...this.pendingDeposits];

    // Filtre par recherche
    if (this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(deposit =>
        deposit.userId.toString().toLowerCase().includes(term) ||
        deposit.walletAddress.toLowerCase().includes(term) ||
        (deposit.transactionId && deposit.transactionId.toLowerCase().includes(term))
      );
    }

    // Filtre par statut
    if (this.statusFilter !== 'all') {
      const isConfirmed = this.statusFilter === 'confirmed';
      filtered = filtered.filter(deposit => deposit.confirmDeposit === isConfirmed);
    }

    // Filtre par réseau
    if (this.networkFilter !== 'all') {
      filtered = filtered.filter(deposit =>
        deposit.walletNetwork.toLowerCase() === this.networkFilter.toLowerCase()
      );
    }

    this.filteredDeposits = filtered;
    this.calculateTotalPages();
    this.goToPage(1); // Reset to first page when filters change
  }

  // Calculer le nombre total de pages pour la pagination
  calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.filteredDeposits.length / this.itemsPerPage);
    if (this.totalPages === 0) this.totalPages = 1;
  }

  // Changer de page
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  // Obtenir les dépôts de la page courante
  get paginatedDeposits(): DepositDTO[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredDeposits.slice(startIndex, startIndex + this.itemsPerPage);
  }

  // Tronquer une adresse pour l'affichage
  truncateAddress(address: string | null): string {
    if (!address) return 'N/A';
    if (address.length <= 14) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 6)}`;
  }

  // Vérifier si un dépôt est en attente
  isPending(deposit: DepositDTO): boolean {
    return !deposit.confirmDeposit;
  }

  // Obtenir la classe CSS en fonction du statut
  getStatusClass(deposit: DepositDTO): string {
    if (deposit.confirmDeposit) return 'status-confirmed';
    return 'status-pending';
  }

  // Obtenir le libellé du statut
  getStatusLabel(deposit: DepositDTO): string {
    if (deposit.confirmDeposit) return 'Confirmed';
    return 'Pending';
  }

  // Approuver un dépôt
  approveDeposit(depositId: number): void {
    this.isProcessing = true;
    this.message = '';

    this.http.post(`${this.apiUrl}/approveDeposit/${depositId}`, {}, { responseType: 'text' })
      .pipe(finalize(() => this.isProcessing = false))
      .subscribe({
        next: () => {
          this.message = 'Deposit approved successfully';
          this.refreshDeposits();
        },
        error: (error) => {
          console.error('Error approving deposit:', error);
          this.message = 'Failed to approve deposit. Please try again.';
        }
      });
  }

  // Rejeter un dépôt
  rejectDeposit(depositId: number): void {
    this.isProcessing = true;
    this.message = '';

    this.http.post(`${this.apiUrl}/rejectDeposit/${depositId}`, {})
      .pipe(finalize(() => this.isProcessing = false))
      .subscribe({
        next: () => {
          this.message = 'Deposit rejected successfully';
          this.refreshDeposits();
        },
        error: (error) => {
          console.error('Error rejecting deposit:', error);
          this.message = 'Failed to reject deposit. Please try again.';
        }
      });
  }

  // Afficher les détails d'un dépôt
  viewDepositDetails(deposit: DepositDTO): void {
    this.selectedDeposit = deposit;
    this.selectedUser = null;

    // Charger les informations de l'utilisateur si pas déjà dans le cache
    if (!this.usersCache[deposit.userId]) {
      this.loadUserDetails(deposit.userId);
    } else {
      this.selectedUser = this.usersCache[deposit.userId];
    }
  }

  // Fermer le modal de détails
  closeDepositDetails(): void {
    this.selectedDeposit = null;
    this.selectedUser = null;
  }

  // Charger les détails d'un utilisateur
  loadUserDetails(userId: number): void {
    this.http.get<AccountDTO>(`${this.apiUrl}/getUserById/${userId}`)
      .subscribe({
        next: (user) => {
          this.usersCache[userId] = user;
          if (this.selectedDeposit && this.selectedDeposit.userId === userId) {
            this.selectedUser = user;
          }
        },
        error: (error) => {
          console.error('Error loading user details:', error);
        }
      });
  }

  // Obtenir l'email d'un utilisateur à partir du cache
  getUserEmail(userId: number): string {
    return this.usersCache[userId]?.email || '';
  }

  // Copier du texte dans le presse-papier
  copyToClipboard(text: string): void {
    // Utilisation de l'API navigator.clipboard au lieu de la dépendance Angular
    navigator.clipboard.writeText(text).then(() => {
      this.message = 'Copied to clipboard';
      setTimeout(() => this.message = '', 3000);
    });
  }

  // Méthode pour définir l'onglet actif
  setActiveTab(tab: 'deposits' | 'withdrawals') {
    this.activeTab = tab;

    if (tab === 'deposits') {
      this.loadDeposits();
    } else {
      this.loadWithdrawals();
    }
  }
}