import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface AdminBankingInfoDTO {
  id?: number;
  accountHolderName: string;
  routingNumber: string;
  accountNumber: string;
  bankName: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminBankingInfoService {
  private readonly API_URL = `${environment.apiUrl}/api/admin-banking-info`;

  constructor(private http: HttpClient) {}

  /**
   * Get admin banking info
   */
  getAdminBankingInfo(): Observable<AdminBankingInfoDTO | { message: string }> {
    return this.http.get<AdminBankingInfoDTO | { message: string }>(`${this.API_URL}/get`);
  }

  /**
   * Save or update admin banking info
   */
  saveAdminBankingInfo(bankingInfo: AdminBankingInfoDTO): Observable<AdminBankingInfoDTO> {
    return this.http.post<AdminBankingInfoDTO>(`${this.API_URL}/save`, bankingInfo);
  }

  /**
   * Check if response is AdminBankingInfo (not just a message)
   */
  isAdminBankingInfo(response: any): response is AdminBankingInfoDTO {
    return response && response.id !== undefined && response.accountHolderName !== undefined;
  }
}
