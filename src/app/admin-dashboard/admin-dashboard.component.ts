import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { AdminDashboardService } from '../../services/admin-dashboard.service';

interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  description?: string;
  date: Date;
}

interface User {
  id: number;
  fullName: string;
  email: string;
  status: string;
  balance: number;
  joinDate: Date;
  lastLogin: Date | null;
  avatarColor: string;
  initials: string;
  transactions?: Transaction[];
}

@Component({
  selector: 'app-admin',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  @ViewChild('fundsForm') fundsForm!: NgForm;

  users: User[] = [];
  selectedUserId: number = 0;
  selectedUser: User | null = null;

  fundAmount: number = 0;
  fundDescription: string = '';
  isSubmitting: boolean = false;
  removeFundAmount: number = 0;
  removeFundDescription: string = '';

  loading = false;
  message = '';

  constructor(private adminDashboardService: AdminDashboardService) { }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true; // Ajout d'un indicateur de chargement

    this.adminDashboardService.getUsers().subscribe({
      next: (result) => {
        // Vérifie si le tableau est vide
        if (!result || result.length === 0) {
          this.message = 'Aucun utilisateur trouvé';
          this.users = [];
          return;
        }

        console.log('results : ' + JSON.stringify(result));

        // Mapper les données du backend en ajoutant les propriétés nécessaires pour le front
        this.users = result.map((user, index) => {
          const initials = user.fullName.substring(0, 2).toUpperCase();
          const avatarColor = this.getRandomColor();

          return {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            status: user.status,
            balance: user.balance, // ✅ Convertir le number en string
            joinDate: new Date(user.joinDate),
            lastLogin: user.lastLogin ? new Date(user.lastLogin) : null,
            avatarColor,
            initials,
            transactions: [] // vide pour l’instant
          };
        });
        console.log('test :' + JSON.stringify(this.users[0]));
        this.message = ''; // Réinitialiser le message
      },
      error: (error) => {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        this.message = 'Erreur lors de la récupération des utilisateurs';
        this.users = []; // Vider la liste en cas d'erreur
      },
      complete: () => {
        this.loading = false; // Terminer le chargement
      }
    });

  }

  // Fonction utilitaire pour générer une couleur aléatoire pour les avatars
  private getRandomColor(): string {
    const colors = ['#627EEA', '#F7931A', '#9945FF', '#26A17B', '#E84142', '#13B5EC', '#2775CA'];
    const randomIndex = Math.floor(Math.random() * colors.length);
    return colors[randomIndex];
  }

  onUserSelect(): void {
    if (this.selectedUserId) {
      this.selectedUser = this.users.find(user => user.id == this.selectedUserId) || null;
      this.fundAmount = 0;
      this.fundDescription = '';
      if (this.fundsForm) {
        this.fundsForm.resetForm();
      }
    } else {
      this.selectedUser = null;
    }
  }

  refreshUserList(): void {
    this.isSubmitting = true;
    setTimeout(() => {
      this.loadUsers();
      if (this.selectedUserId) {
        this.onUserSelect();
      }
      this.isSubmitting = false;
    }, 800);
  }

  addFunds(): void {
    if (!this.selectedUser || this.fundAmount <= 0) {
      return;
    }

    this.isSubmitting = true;

    this.adminDashboardService.addFund(this.selectedUser.id, this.fundAmount).subscribe({
      next: (response) => {
        this.message = response; // "Funds added successfully"
        // Mettre à jour le solde localement
        const updatedUser = this.users.find(u => u.id === this.selectedUser?.id);
        if (updatedUser) {
          updatedUser.balance += this.fundAmount;
        }
        // Réinitialiser les champs
        this.fundAmount = 0;
      },
      error: (error) => {
        console.error('Erreur lors de l’ajout de fonds:', error);
        this.message = 'Erreur lors de l’ajout de fonds';
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });
  }

  removeFunds(): void {
  if (!this.selectedUser || this.removeFundAmount <= 0) {
    return;
  }
  
  if (this.selectedUser.balance < this.removeFundAmount) {
    this.message = "The user doesn't have enough balance";
    return;
  }
  
  this.isSubmitting = true;
  
  this.adminDashboardService.removeFund(this.selectedUser.id, this.removeFundAmount).subscribe({
    next: (response) => {
      this.message = response; // "Funds removed successfully"
      const updatedUser = this.users.find(u => u.id === this.selectedUser?.id);
      if (updatedUser) {
        updatedUser.balance -= this.removeFundAmount;
      }
      
      // Réinitialiser les champs
      this.removeFundAmount = 0;
      this.removeFundDescription = '';
    },
    error: (error) => {
      console.error('Erreur lors du retrait de fonds:', error);
      this.message = 'Erreur lors du retrait de fonds';
    },
    complete: () => {
      this.isSubmitting = false;
    }
  });
}

}