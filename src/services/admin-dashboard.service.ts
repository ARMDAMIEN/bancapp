import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environment/environment';
import { map, Observable } from 'rxjs';
import { AdminDashboardResponse } from '../interfaces/admin-dashboard-response';

@Injectable({
  providedIn: 'root'
})
export class AdminDashboardService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getUsers(): Observable<AdminDashboardResponse[]> {
    return this.http.get<AdminDashboardResponse[]>(`${this.apiUrl}/getUsers`);
  }

  addFund(userId: number, amount: number): Observable<string> {
    const payload = {
      userId: userId,
      amount: amount
    };

    return this.http.post(`${this.apiUrl}/addFunds`, payload, {
      responseType: 'text'
    });
  }

  removeFund(userId: number, amount: number): Observable<string> {
    const payload = {
      userId: userId,
      amount: amount
    };

    return this.http.post(`${this.apiUrl}/removeFunds`, payload, {
      responseType: 'text'
    });
  }

}
