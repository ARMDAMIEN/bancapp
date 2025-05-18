import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Trade } from '../interfaces/trade';
import { Observable } from 'rxjs';
import { environment } from '../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class TradesService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }


  getLiveTrades(): Observable<Trade[]> {
    // Ajouter un timestamp unique pour contourner toute mise en cache
    const now = Date.now();

    // Construire l'URL avec le paramètre timestamp
    const url = `${this.apiUrl}/getLiveTrades?timestamp=${now}`;

    console.log("Appel HTTP à", url);

    // Créer une nouvelle requête HTTP à chaque appel
    return this.http.get<Trade[]>(url);
  }

  getBalance(): Observable<number> {
    // Ajouter un timestamp unique pour contourner toute mise en cache
    const now = Date.now();

    // Construire l'URL avec le paramètre timestamp
    const url = `${this.apiUrl}/getBalance`;

    // Créer une nouvelle requête HTTP à chaque appel
    return this.http.get<number>(url);
  }
}
