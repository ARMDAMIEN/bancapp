// Dans votre service
import { Injectable } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface CryptoCandle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  quoteAssetVolume: number;
  numberOfTrades: number;
}

@Injectable({
  providedIn: 'root'
})
export class BinanceChartService {
  
  private baseUrl = 'https://api.binance.com/api/v3';
  private httpClientWithoutInterceptor: HttpClient;

  
  constructor(private http: HttpClient, private httpBackend: HttpBackend) {
    this.httpClientWithoutInterceptor = new HttpClient(httpBackend);
  }
  
  // Récupérer les données de chandeliers (Klines)
  getKlines(symbol: string, interval: string = '1m', limit: number = 60): Observable<CryptoCandle[]> {
    return this.httpClientWithoutInterceptor.get<any[]>(`${this.baseUrl}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`)
      .pipe(
        map(response => {
          return response.map(item => ({
            openTime: item[0],
            open: parseFloat(item[1]),
            high: parseFloat(item[2]),
            low: parseFloat(item[3]),
            close: parseFloat(item[4]),
            volume: parseFloat(item[5]),
            closeTime: item[6],
            quoteAssetVolume: parseFloat(item[7]),
            numberOfTrades: parseInt(item[8])
          }));
        }),
        catchError(err => {
          console.error('Erreur lors de la récupération des données:', err);
          return of([]);
        })
      );
  }
  
  // Récupérer les prix actuels
  getCurrentPrices(symbols: string[]): Observable<{[key: string]: number}> {
    const requests = symbols.map(symbol => 
      this.httpClientWithoutInterceptor.get<any>(`${this.baseUrl}/ticker/price?symbol=${symbol}`)
        .pipe(
          map(response => ({ symbol, price: parseFloat(response.price) })),
          catchError(err => {
            console.error(`Erreur pour ${symbol}:`, err);
            return of({ symbol, price: 0 });
          })
        )
    );
    
    return forkJoin(requests).pipe(
      map(results => {
        const priceMap: {[key: string]: number} = {};
        results.forEach(item => {
          priceMap[item.symbol] = item.price;
        });
        return priceMap;
      })
    );
  }
}