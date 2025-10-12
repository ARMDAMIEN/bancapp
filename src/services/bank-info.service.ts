import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface BankInfoDTO {
  id?: number;
  userId?: number;
  accountHolderName: string;
  routingNumber: string;
  accountNumber: string;
  bankName: string;
}

@Injectable({
  providedIn: 'root'
})
export class BankInfoService {
  private readonly API_URL = `${environment.apiUrl}/api/bank-info`;

  constructor(private http: HttpClient) {}

  /**
   * Get bank info for authenticated user
   */
  getBankInfo(): Observable<BankInfoDTO | { message: string }> {
    return this.http.get<BankInfoDTO | { message: string }>(`${this.API_URL}/get`);
  }

  /**
   * Get bank info by user ID (admin)
   */
  getBankInfoByUserId(userId: number): Observable<BankInfoDTO | { message: string }> {
    return this.http.get<BankInfoDTO | { message: string }>(`${this.API_URL}/user/${userId}`);
  }

  /**
   * Save or update bank info
   */
  saveBankInfo(bankInfo: BankInfoDTO): Observable<BankInfoDTO> {
    return this.http.post<BankInfoDTO>(`${this.API_URL}/save`, bankInfo);
  }

  /**
   * Check if response is a BankInfo (not just a message)
   */
  isBankInfo(response: any): response is BankInfoDTO {
    return response && response.id !== undefined && response.accountHolderName !== undefined;
  }
}
