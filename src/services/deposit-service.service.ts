import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

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

@Injectable({
  providedIn: 'root'
})


export class DepositServiceService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  saveDeposit(userData: UserData): Observable<string> {
    return this.http.post(`${this.apiUrl}/createDeposit`, userData, { responseType: 'text' });
  }

  getUnconfirmedDeposits(): Observable<DepositDTO[]> {
    return this.http.get<DepositDTO[]>(`${this.apiUrl}/getUnconfirmedDeposits`);
  }

  // Méthode pour approuver un dépôt
  approveDeposit(depositId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/approveDeposit/${depositId}`, {});
  }

  // Méthode pour rejeter un dépôt
  rejectDeposit(depositId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/rejectDeposit/${depositId}`, {});
  }

  // Méthode pour obtenir les détails d'un utilisateur
  getUserDetails(userId: number): Observable<AccountDTO> {
    return this.http.get<AccountDTO>(`${this.apiUrl}/getUserById/${userId}`);
  }
}