import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CryptoMarketData } from '../../services/crypto-market-data-service.service';
import { interval, Subscription, switchMap } from 'rxjs';

import {
  ChartComponent,
  ApexAxisChartSeries,
  ApexChart,
  ApexYAxis,
  ApexXAxis,
  ApexTitleSubtitle,
  ApexTooltip,
  ApexTheme,
  ApexFill,
  ApexStroke,
  ApexMarkers,
  ApexGrid
} from 'ng-apexcharts';
import { CryptoChartService } from '../../services/crypto-chart.service';
import { BinanceChartService, CryptoCandle } from '../../services/binance-chart.service';
import { TradesService } from '../../services/trades.service';
import { GraphComponent } from '../graph/graph.component';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  title: ApexTitleSubtitle;
  tooltip: ApexTooltip;
  theme: ApexTheme;
  fill: ApexFill;
  stroke: ApexStroke;
  markers: ApexMarkers;
  grid: ApexGrid;
};

interface Trade {
  id: number;
  symbol: string;
  type: 'buy' | 'sell';
  price: number;
  amount: number;
  timestamp: number;
  profit: number;
  profitPercent: number;
}

@Component({
  selector: 'app-live-view',
  templateUrl: './live-view.component.html',
  styleUrl: './live-view.component.css'
})

export class LiveViewComponent implements OnInit, OnDestroy {

  // Référence au composant graphique
  @ViewChild(GraphComponent) graphComponent!: GraphComponent;

  balance: number = 0;
  
  // Propriétés pour le prix BTC
  currentPrice: number = 0;
  previousPrice: number = 0;
  priceChange: number = 0;
  priceChangePercent: number = 0;
  priceDirection: 'up' | 'down' | 'neutral' = 'neutral';
  
  // Timeframe sélectionné
  selectedTimeframe: string = '5m';
  availableTimeframes = [
    { value: '1m', label: '1m', limit: 60 },
    { value: '5m', label: '5m', limit: 60 },
    { value: '15m', label: '15m', limit: 60 },
    { value: '1h', label: '1h', limit: 48 },
    { value: '4h', label: '4h', limit: 48 },
    { value: '1d', label: '1d', limit: 30 }
  ];
  
  // Abonnements
  private balanceSubscription?: Subscription;
  private priceSubscription?: Subscription;

  constructor(
    private tradeService: TradesService,
    private binanceService: BinanceChartService
  ) { }

  ngOnInit(): void {
    // Récupérer le balance
    this.loadBalance();
    
    // Récupérer le prix initial du BTC
    this.loadInitialBTCPrice();
    
    // Démarrer la mise à jour en temps réel du prix
    this.startPriceUpdates();
  }

  ngOnDestroy(): void {
    // Nettoyer les abonnements
    if (this.balanceSubscription) {
      this.balanceSubscription.unsubscribe();
    }
    
    if (this.priceSubscription) {
      this.priceSubscription.unsubscribe();
    }
  }
  
  private loadBalance(): void {
    this.balanceSubscription = this.tradeService.getBalance().subscribe({
      next: (response) => {
        this.balance = response;
      },
      error: (error) => {
        console.error("Erreur lors de la récupération du balance : " + error);
      }
    });
  }
  
  private loadInitialBTCPrice(): void {
    // Récupérer le prix actuel du BTC
    this.binanceService.getCurrentPrices(['BTCUSDC']).subscribe({
      next: (prices) => {
        if (prices['BTCUSDC']) {
          this.currentPrice = prices['BTCUSDC'];
          this.previousPrice = this.currentPrice; // Initialiser le prix précédent
        }
      },
      error: (error) => {
        console.error("Erreur lors de la récupération du prix BTC initial:", error);
        // Valeur par défaut en cas d'erreur
        this.currentPrice = 32456.78;
        this.previousPrice = this.currentPrice;
      }
    });
  }
  
  private startPriceUpdates(): void {
    // Mettre à jour le prix toutes les 10 secondes
    this.priceSubscription = interval(10000)
      .pipe(
        switchMap(() => this.binanceService.getCurrentPrices(['BTCUSDC']))
      )
      .subscribe({
        next: (prices) => {
          if (prices['BTCUSDC']) {
            // Sauvegarder le prix précédent
            this.previousPrice = this.currentPrice;
            
            // Mettre à jour le prix actuel
            this.currentPrice = prices['BTCUSDC'];
            
            // Calculer le changement de prix
            this.calculatePriceChange();
          }
        },
        error: (error) => {
          console.error("Erreur lors de la mise à jour du prix BTC:", error);
        }
      });
  }
  
  private calculatePriceChange(): void {
    if (this.previousPrice > 0) {
      // Calculer la différence absolue
      this.priceChange = this.currentPrice - this.previousPrice;
      
      // Calculer le pourcentage de changement
      this.priceChangePercent = (this.priceChange / this.previousPrice) * 100;
      
      // Déterminer la direction du prix
      if (this.priceChange > 0) {
        this.priceDirection = 'up';
      } else if (this.priceChange < 0) {
        this.priceDirection = 'down';
      } else {
        this.priceDirection = 'neutral';
      }
    }
  }
  
  // Gestion des timeframes
  onTimeframeChange(timeframe: string): void {
    if (this.selectedTimeframe !== timeframe) {
      this.selectedTimeframe = timeframe;
      
      // Notifier le composant graphique du changement
      if (this.graphComponent) {
        this.graphComponent.changeTimeframe(timeframe);
      }
    }
  }
  
  isTimeframeActive(timeframe: string): boolean {
    return this.selectedTimeframe === timeframe;
  }
  
  // Actions du graphique
  onToggleFullscreen(): void {
    if (this.graphComponent) {
      this.graphComponent.toggleFullscreen();
    }
  }
  
  onResetZoom(): void {
    if (this.graphComponent) {
      this.graphComponent.resetZoom();
    }
  }
  
  // Méthodes utilitaires pour le template
  get formattedPrice(): string {
    return this.currentPrice.toFixed(2);
  }
  
  get formattedPriceChange(): string {
    const sign = this.priceChange >= 0 ? '+' : '';
    return `${sign}${this.priceChangePercent.toFixed(2)}%`;
  }
  
  get priceChangeClass(): string {
    return this.priceChange >= 0 ? 'positive' : 'negative';
  }
  
  get isLoading(): boolean {
    return this.currentPrice === 0;
  }
}