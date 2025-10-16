import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface UserProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  companyName?: string;
  companyCreationDate?: string;
  companyAddress?: string;
  createdAt: string;
  updatedAt: string;
  currentStep?: string;
  currentSubstep?: string;
  stepUpdatedAt?: string;
  hasSigned: boolean;
  hasAllDocuments: boolean;
  hasAllRibDocuments: boolean;
  hasIdentityDocuments: boolean;
  accountBalance?: number;
  lastBalanceUpdate?: string;
  selectedOffer?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly API_URL = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  /**
   * Get current user profile
   */
  getCurrentUserProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.API_URL}/profile`);
  }
}
