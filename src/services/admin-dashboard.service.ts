import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

// Interfaces correspondant à votre backend
export interface UserDTO {
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
  documentsUploadDate?: string;
  hasAllDocuments: boolean;
  accountBalance: number;
  lastBalanceUpdate?: string;
}

export interface AdminUsersResponse {
  users: UserDTO[];
  totalUsers: number;
  totalBalance: number;
  usersWithDocuments: number;
  retrievedAt: string;
}

export interface UserStatsResponse {
  totalUsers: number;
  totalBalance: number;
  averageBalance: number;
  usersWithDocuments: number;
  usersWithBalance: number;
  recentUsers: number;
  generatedAt: string;
}

export interface BalanceUpdateResponse {
  message: string;
  userId: number;
  userEmail: string;
  oldBalance: number;
  newBalance: number;
  operation: string;
  amount: number;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminDashboardService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Récupérer tous les utilisateurs avec informations complètes
  getAllUsers(): Observable<AdminUsersResponse> {
    return this.http.get<AdminUsersResponse>(`${this.apiUrl}/users/all`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Récupérer un utilisateur spécifique par ID
  getUserById(userId: number): Observable<UserDTO> {
    return this.http.get<UserDTO>(`${this.apiUrl}/users/${userId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Récupérer les statistiques des utilisateurs
  getUsersStats(): Observable<UserStatsResponse> {
    return this.http.get<UserStatsResponse>(`${this.apiUrl}/users/stats`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Ajouter des fonds à un utilisateur (admin uniquement)
  addFunds(userId: number, amount: number, reason?: string): Observable<BalanceUpdateResponse> {
    return this.updateUserBalance(userId, amount, 'add');
  }

  // Retirer des fonds d'un utilisateur (admin uniquement)
  removeFunds(userId: number, amount: number, reason?: string): Observable<BalanceUpdateResponse> {
    return this.updateUserBalance(userId, amount, 'subtract');
  }

  // Méthode pour mettre à jour le solde (générique)
  updateUserBalance(userId: number, amount: number, operation: 'add' | 'subtract'): Observable<BalanceUpdateResponse> {
    const params = new URLSearchParams();
    params.append('amount', amount.toString());
    params.append('operation', operation);
    params.append('userId', userId.toString());
    
    return this.http.put<BalanceUpdateResponse>(
      `${this.apiUrl}/users/balance?${params.toString()}`, 
      {}
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Méthode alternative pour mettre à jour le solde par email
  updateUserBalanceByEmail(userEmail: string, amount: number, operation: 'add' | 'subtract'): Observable<BalanceUpdateResponse> {
    const params = new URLSearchParams();
    params.append('amount', amount.toString());
    params.append('operation', operation);
    params.append('userEmail', userEmail);
    
    return this.http.put<BalanceUpdateResponse>(
      `${this.apiUrl}/users/balance?${params.toString()}`, 
      {}
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Récupérer le profil de l'utilisateur actuellement connecté
  getCurrentUserProfile(): Observable<UserDTO> {
    return this.http.get<UserDTO>(`${this.apiUrl}/users/profile`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Convertir UserDTO en format compatible avec votre interface actuelle
  convertToLegacyUser(userDTO: UserDTO): any {
    return {
      id: userDTO.id.toString(),
      firstName: userDTO.firstName,
      lastName: userDTO.lastName,
      email: userDTO.email,
      balance: userDTO.accountBalance, // Mapping pour compatibilité
      accountBalance: userDTO.accountBalance,
      status: 'active', // Vous devrez ajouter ce champ dans votre backend si nécessaire
      lastActivity: new Date(userDTO.updatedAt),
      joinDate: new Date(userDTO.createdAt),
      ssn: userDTO.ssn,
      dateOfBirth: userDTO.dateOfBirth,
      companyName: userDTO.companyName,
      companyCreationDate: userDTO.companyCreationDate,
      einNumber: userDTO.einNumber,
      rib1Path: userDTO.rib1Path,
      rib2Path: userDTO.rib2Path,
      rib3Path: userDTO.rib3Path,
      documentsUploadDate: userDTO.documentsUploadDate,
      hasAllDocuments: userDTO.hasAllDocuments,
      lastBalanceUpdate: userDTO.lastBalanceUpdate
    };
  }

  // Méthode utilitaire pour transformer la réponse en format attendu par votre component
  getFormattedUsers(): Observable<any[]> {
    return this.getAllUsers().pipe(
      map(response => response.users.map(user => this.convertToLegacyUser(user)))
    );
  }

  // Méthode pour obtenir les statistiques formatées
  getFormattedStats(): Observable<any> {
    return this.getUsersStats().pipe(
      map(stats => ({
        totalUsers: stats.totalUsers,
        totalFunds: stats.totalBalance,
        activeUsers: stats.usersWithBalance, // Approximation
        totalTransactions: stats.recentUsers * 10, // Estimation
        averageBalance: stats.averageBalance,
        usersWithDocuments: stats.usersWithDocuments,
        recentUsers: stats.recentUsers
      }))
    );
  }

  // Gestion des erreurs
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = error.error.message;
    } else {
      // Erreur côté serveur
      switch (error.status) {
        case 400:
          errorMessage = error.error?.message || 'Bad request';
          break;
        case 401:
          errorMessage = 'Unauthorized access';
          break;
        case 403:
          errorMessage = 'Access forbidden';
          break;
        case 404:
          errorMessage = 'User not found';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later';
          break;
        default:
          errorMessage = `Error: ${error.message}`;
      }
    }
    
    console.error('AdminDashboardService Error:', error);
    return throwError(() => ({ message: errorMessage }));
  }

  // Méthode utilitaire pour les transactions admin avec gestion d'erreurs spécifiques
  processAdminTransaction(userId: number, amount: number, operation: 'add' | 'subtract', reason?: string): Observable<BalanceUpdateResponse> {
    // Validation côté client
    if (amount <= 0) {
      return throwError(() => ({ message: 'Amount must be greater than 0' }));
    }

    return this.updateUserBalance(userId, amount, operation).pipe(
      map(response => {
        // Log pour audit
        console.log(`Admin transaction: ${operation} €${amount} for user ${response.userId} (${response.userEmail})`);
        return response;
      }),
      catchError(error => {
        // Gestion d'erreurs spécifiques pour les transactions admin
        let errorMessage = 'Transaction failed';
        
        if (error.error?.message) {
          if (error.error.message.includes('Insufficient balance')) {
            errorMessage = 'Cannot remove funds: Insufficient user balance';
          } else if (error.error.message.includes('User not found')) {
            errorMessage = 'User not found';
          } else {
            errorMessage = error.error.message;
          }
        }
        
        return throwError(() => ({ message: errorMessage }));
      })
    );
  }
}