// live-market-data.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, timer, forkJoin, of } from 'rxjs';
import { map, switchMap, tap, shareReplay, catchError } from 'rxjs/operators';
import { environment } from '../environment/environment';
import { webSocket } from 'rxjs/webSocket';

export interface CryptoMarketData {
  symbol: string;      // Paire de trading (ex: BTCUSDC)
  price: number;       // Prix actuel
  timestamp: number;   // Timestamp en millisecondes
  volume: number;      // Volume sur 24h
  change24h: number;   // Changement en pourcentage sur 24h
  high24h: number;     // Plus haut sur 24h
  low24h: number;      // Plus bas sur 24h
}

@Injectable({
  providedIn: 'root'
})
export class CryptoMarketData {
  private realTimeDataSubject = new BehaviorSubject<CryptoMarketData[]>([]);
  public realTimeData$ = this.realTimeDataSubject.asObservable();
  
  private delayedDataSubject = new BehaviorSubject<CryptoMarketData[]>([]);
  public delayedData$ = this.delayedDataSubject.asObservable();
  
  private dataBuffer: { [timestamp: number]: CryptoMarketData[] } = {};
  private delayMilliseconds = 2000;
  
  // Liste des cryptomonnaies à suivre (format Finnhub)
  private cryptoSymbols = ['BINANCE:BTCUSDC', 'BINANCE:ETHUSDC', 'BINANCE:SOLUSDC', 'BINANCE:BNBUSDC', 'BINANCE:ADAUSDC'];
  
  // Clé API Finnhub
  private apiKey = environment.finnhubApiKey;
  
  constructor(private http: HttpClient) {
    this.initDataFeed();
    this.initDelayedDataFeed();
  }
  
  private initDataFeed() {
    // Polling toutes les 500ms
    timer(0, 500).pipe(
      switchMap(() => this.fetchCryptoDataFromAPI())
    ).subscribe(data => {
      const currentTime = Date.now();
      this.realTimeDataSubject.next(data);
      this.dataBuffer[currentTime] = data;
      this.cleanupOldData(currentTime - 10000);
    });
  }
  
  private fetchCryptoDataFromAPI(): Observable<CryptoMarketData[]> {
    const requests = this.cryptoSymbols.map(fullSymbol => {
      // Extraire le symbole de base (ex: BTCUSDC depuis BINANCE:BTCUSDC)
      const symbol = fullSymbol.split(':')[1];
      
      return this.http.get<any>(`https://finnhub.io/api/v1/quote?symbol=${fullSymbol}&token=${this.apiKey}`)
        .pipe(
          map(response => ({
            symbol: symbol,
            price: response.c,
            timestamp: Date.now(),
            volume: response.v || 0,
            change24h: response.dp || 0,
            high24h: response.h || 0,
            low24h: response.l || 0
          } as CryptoMarketData)),
          catchError(error => {
            console.error(`Error fetching data for ${symbol}:`, error);
            return of({
              symbol: symbol,
              price: 0,
              timestamp: Date.now(),
              volume: 0,
              change24h: 0,
              high24h: 0,
              low24h: 0
            } as CryptoMarketData);
          })
        );
    });
    
    return forkJoin(requests);
  }
  
  // Le reste du code est similaire...
  private initDelayedDataFeed() {
    timer(this.delayMilliseconds, 500).subscribe(() => {
      const targetTime = Date.now() - this.delayMilliseconds;
      const closestTimestamp = this.findClosestTimestamp(targetTime);
      
      if (closestTimestamp && this.dataBuffer[closestTimestamp]) {
        this.delayedDataSubject.next(this.dataBuffer[closestTimestamp]);
      }
    });
  }
  
  private findClosestTimestamp(targetTime: number): number | null {
    const timestamps = Object.keys(this.dataBuffer).map(Number);
    if (timestamps.length === 0) return null;
    
    return timestamps.reduce((prev, curr) => {
      return Math.abs(curr - targetTime) < Math.abs(prev - targetTime) ? curr : prev;
    });
  }
  
  private cleanupOldData(olderThan: number) {
    Object.keys(this.dataBuffer)
      .map(Number)
      .filter(timestamp => timestamp < olderThan)
      .forEach(timestamp => {
        delete this.dataBuffer[timestamp];
      });
  }
  
  public setDelay(milliseconds: number) {
    this.delayMilliseconds = milliseconds;
    this.initDelayedDataFeed();
  }
  
  public testAPIConnection(): void {
    const testSymbol = 'BINANCE:BTCUSDC';
    console.log(`Test de connexion à l'API avec la crypto ${testSymbol}...`);
    
    this.http.get<any>(`https://finnhub.io/api/v1/quote?symbol=${testSymbol}&token=${this.apiKey}`)
      .subscribe(
        response => {
          console.log('✅ Connexion à l\'API crypto réussie:', response);
          console.log('Prix actuel (BTC):', response.c);
          console.log('Changement 24h (%):', response.dp);
        },
        error => {
          console.error('❌ Erreur de connexion à l\'API crypto:', error);
          if (error.status === 401) {
            console.error('Problème d\'authentification - vérifiez votre clé API');
          }
        }
      );
  }
}