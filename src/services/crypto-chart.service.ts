// Dans votre service
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface CandleData {
  time: number;      // timestamp en secondes
  open: number;
  high: number;
  low: number;
  close: number;
  volumefrom: number;
  volumeto: number;
}

@Injectable({
  providedIn: 'root'
})
export class CryptoChartService {
  constructor(private http: HttpClient) {}
  
  // Récupérer des données OHLC (chandelier) pour une crypto
  getHistoricalData(symbol: string, currency: string = 'USD', limit: number = 60, aggregate: number = 1): Observable<CandleData[]> {
    // Intervalle: minute, hour, day
    const interval = 'minute';
    
    return this.http.get<any>(`https://min-api.cryptocompare.com/data/v2/histo${interval}?fsym=${symbol}&tsym=${currency}&limit=${limit}&aggregate=${aggregate}`)
      .pipe(
        map(response => {
          if (response.Response === 'Success') {
            return response.Data.Data;
          }
          return [];
        })
      );
  }
  
  // Récupérer le prix en temps réel
  getCurrentPrice(symbols: string[], currency: string = 'USD'): Observable<{[key: string]: number}> {
    const symbolList = symbols.join(',');
    
    return this.http.get<any>(`https://min-api.cryptocompare.com/data/pricemulti?fsyms=${symbolList}&tsyms=${currency}`)
      .pipe(
        map(response => {
          const result: {[key: string]: number} = {};
          for (const symbol of symbols) {
            if (response[symbol]) {
              result[symbol] = response[symbol][currency];
            }
          }
          return result;
        })
      );
  }
}