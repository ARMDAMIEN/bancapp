import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface BankingOptionDTO {
  id?: number;
  userId?: number;
  title: string;
  badge: string;
  type: string;
  amount: number;
  structure: string;
  payback: number;
  term: number;
  payment: number;
  frequency: string;
  delay: number;
}

@Injectable({
  providedIn: 'root'
})
export class BankingOptionService {
  private readonly API_URL = `${environment.apiUrl}/banking-options`;

  constructor(private http: HttpClient) {}

  /**
   * Get banking option for authenticated user
   */
  getBankingOption(): Observable<BankingOptionDTO | { message: string }> {
    return this.http.get<BankingOptionDTO | { message: string }>(`${this.API_URL}/getBankingOption`);
  }

  /**
   * Get banking option by user ID (admin only)
   */
  getBankingOptionByUserId(userId: number): Observable<BankingOptionDTO | { message: string }> {
    return this.http.get<BankingOptionDTO | { message: string }>(`${this.API_URL}/admin/user/${userId}`);
  }

  /**
   * Save banking option (admin)
   */
  saveBankingOption(bankingOption: BankingOptionDTO): Observable<BankingOptionDTO> {
    return this.http.post<BankingOptionDTO>(`${this.API_URL}/saveBankingOption`, bankingOption);
  }

  /**
   * Check if response is a BankingOption (not just a message)
   */
  isBankingOption(response: any): response is BankingOptionDTO {
    return response && response.id !== undefined && response.title !== undefined;
  }
}
