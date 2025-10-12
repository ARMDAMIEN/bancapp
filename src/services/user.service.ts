import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
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
    console.log('=== USER SERVICE: Calling API ===');
    console.log('API URL:', `${this.API_URL}/profile`);

    return this.http.get<UserProfile>(`${this.API_URL}/profile`).pipe(
      tap(response => {
        console.log('=== USER SERVICE: API Response received ===');
        console.log('Raw response from backend:', response);
        console.log('Response keys:', Object.keys(response));
        console.log('companyAddress in response:', 'companyAddress' in response);
        console.log('companyAddress value from API:', response.companyAddress);
      })
    );
  }
}
