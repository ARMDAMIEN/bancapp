import { Component, ViewChild } from '@angular/core';
import { interval, Subscription, switchMap } from 'rxjs';
import { BinanceChartService, CryptoCandle } from '../../services/binance-chart.service';

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
  selector: 'app-graph',
  templateUrl: './graph.component.html',
  styleUrl: './graph.component.css'
})

export class GraphComponent {
  @ViewChild("chart") chart!: ChartComponent;
  public chartOptions: Partial<ChartOptions>;
  
  // Configuration
  availableSymbols = ['BTCUSDC', 'ETHUSDC', 'SOLUSDC', 'BNBUSDC', 'ADAUSDC'];
  selectedSymbol = 'BTCUSDC';

  lastPrice = 0;
  priceChange = 0;

  isLoading = false;
  
  // Données
  realtimeData: CryptoCandle[] = [];
  delayedData: CryptoCandle[] = [];
  delayMs: number = 2000;
  trades: Trade[] = [];
  tradeId: number = 1;
  
  // Compteurs pour trades
  tradesPositifs: number = 0;
  tradesNegatifs: number = 0;
  seuilPositifMin: number = 0.75; // 75% minimum de trades positifs
  seuilPositifMax: number = 0.80; // 80% maximum de trades positifs
  
  // Abonnements
  private dataSubscription?: Subscription;
  private tradeSimulationSubscription?: Subscription;
  
  constructor(private cryptoService: BinanceChartService) {
    // Initialiser les options du graphique
    this.chartOptions = {
      series: [{
        name: "Prix",
        data: []
      }],
      chart: {
        type: "candlestick",
        height: 400,
        animations: {
          enabled: false
        },
        toolbar: {
          show: true,
          tools: {
            download: false,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true
          }
        },
        background: '#1a1c25'
      },
      xaxis: {
        type: "datetime",
        labels: {
          datetimeUTC: false,
          style: {
            colors: '#a3a3a3'
          }
        }
      },
      yaxis: {
        labels: {
          formatter: function(val) {
            return val.toFixed(2);
          },
          style: {
            colors: '#a3a3a3'
          }
        }
      },
      tooltip: {
        theme: "dark",
        x: {
          format: "dd MMM HH:mm:ss"
        }
      },
      theme: {
        mode: 'dark',
        palette: 'palette1'
      },
      fill: {
        opacity: 1
      },
      stroke: {
        width: 1
      },
      markers: {
        size: 0
      },
      grid: {
        borderColor: '#2b2d3e',
        xaxis: {
          lines: {
            show: true
          }
        }
      }
    };
  }

  ngOnInit(): void {
    // Définir un délai aléatoire entre 1 et 3 secondes
    this.delayMs = 1000 + Math.floor(Math.random() * 2000);
    console.log(`Délai configuré: ${this.delayMs}ms`);
    
    // Charger les données initiales
    this.loadInitialData();
    
    // Démarrer la mise à jour en temps réel
    this.startRealtimeUpdates();
    
    // Démarrer la simulation de trades
    this.tradeSimulationSubscription = interval(2000).subscribe(() => {
      this.simulateTrade();
      this.ajusterSeuils();
    });
  }
  
  loadInitialData(): void {
    this.cryptoService.getKlines(this.selectedSymbol)
      .subscribe(data => {
        this.realtimeData = data;
        
        // Appliquer le délai (retarder de quelques bougies)
        const delayedCount = Math.floor(this.delayMs / 60000); // Convertir ms en minutes
        const delayIndex = Math.max(0, data.length - delayedCount);
        this.delayedData = data.slice(0, delayIndex);
        
        this.updateChartData();
      });
  }
  
  startRealtimeUpdates(): void {
    this.dataSubscription = interval(5000) // Mettre à jour toutes les 5 secondes
      .pipe(
        switchMap(() => this.cryptoService.getKlines(this.selectedSymbol))
      )
      .subscribe(data => {
        // Mettre à jour les données en temps réel
        this.realtimeData = data;
        
        // Simuler le délai
        setTimeout(() => {
          // Calculer l'indice correspondant au délai
          const currentTime = Date.now();
          const targetTime = currentTime - this.delayMs;
          
          // Trouver la bougie la plus proche du temps cible
          const closestIndex = this.findClosestCandleIndex(targetTime);
          
          if (closestIndex >= 0) {
            this.delayedData = this.realtimeData.slice(0, closestIndex + 1);
            this.updateChartData();
          }
        }, 0); // Pas besoin d'attendre car nous simulons déjà un délai
      });
  }
  
  findClosestCandleIndex(targetTime: number): number {
    if (this.realtimeData.length === 0) return -1;
    
    let closestIndex = 0;
    let minDiff = Math.abs(this.realtimeData[0].closeTime - targetTime);
    
    for (let i = 1; i < this.realtimeData.length; i++) {
      const diff = Math.abs(this.realtimeData[i].closeTime - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
      
      // Si nous avons dépassé la cible, prendre l'élément précédent
      if (this.realtimeData[i].closeTime > targetTime && i > 0) {
        return i - 1;
      }
    }
    
    return closestIndex;
  }
  
  updateChartData(): void {
    if (this.delayedData.length === 0) return;
    
    // Formater les données pour ApexCharts
    const formattedData = this.delayedData.map(candle => ({
      x: new Date(candle.openTime),
      y: [candle.open, candle.high, candle.low, candle.close]
    }));
    
    // Mettre à jour le graphique
    this.chartOptions.series = [{
      name: this.selectedSymbol,
      data: formattedData
    }];
    
    // Mettre à jour le titre
    const lastPrice = this.delayedData[this.delayedData.length - 1].close;
    this.chartOptions.title = {
      text: `${this.selectedSymbol}: ${lastPrice.toFixed(2)} USD`,
      align: 'left',
      style: {
        color: '#f1f1f1'
      }
    };
  }
  
  changeSymbol(symbol: string): void {
    this.selectedSymbol = symbol;
    this.loadInitialData();
  }
  
  simulateTrade(): void {
    // Sélectionner une crypto aléatoire
    const randomIndex = Math.floor(Math.random() * this.availableSymbols.length);
    const symbol = this.availableSymbols[randomIndex];
    
    if (this.delayedData.length === 0 || this.realtimeData.length === 0) return;
    
    // Obtenir le dernier prix "affiché" (retardé)
    const lastDelayedIndex = this.delayedData.length - 1;
    const displayedPrice = this.delayedData[lastDelayedIndex].close;
    
    // Obtenir le prix "en temps réel" (que nous connaissons déjà)
    const lastRealIndex = this.realtimeData.length - 1;
    const realTimePrice = this.realtimeData[lastRealIndex].close;
    
    // Simuler un mouvement de prix futur (nous utilisons le prix réel comme "futur" par rapport au prix retardé)
    const priceChange = (realTimePrice - displayedPrice) / displayedPrice;
    const isPositive = priceChange > 0;
    
    // Décider si nous devons afficher ce trade
    if (this.shouldDisplayTrade(isPositive)) {
      // Générer un montant aléatoire
      const amount = 0.01 + Math.random() * 0.5; // Entre 0.01 et 0.51 unités
      
      // Créer le trade
      const trade: Trade = {
        id: this.tradeId++,
        symbol: symbol,
        type: isPositive ? 'buy' : 'sell',
        price: displayedPrice,
        amount: amount,
        timestamp: Date.now(),
        profit: amount * displayedPrice * priceChange,
        profitPercent: priceChange * 100
      };
      
      // Ajouter le trade au début de la liste
      this.trades.unshift(trade);
      
      // Limiter à 10 trades visibles
      if (this.trades.length > 10) {
        this.trades.pop();
      }
      
      // Mettre à jour les compteurs
      if (isPositive) {
        this.tradesPositifs++;
      } else {
        this.tradesNegatifs++;
      }
    }
  }
  
  shouldDisplayTrade(isPositive: boolean): boolean {
    const ratioActuel = this.calculerRatioPositif();
    
    if (isPositive) {
      // Pour les trades positifs
      if (ratioActuel < this.seuilPositifMax) {
        return true; // Afficher ce trade positif
      } else {
        // Trop de trades positifs récemment, on n'affiche pas celui-ci
        return false;
      }
    } else {
      // Pour les trades négatifs
      if (ratioActuel > this.seuilPositifMin) {
        return true; // Afficher ce trade négatif pour maintenir la crédibilité
      } else {
        // Déjà assez de trades négatifs récemment, on n'affiche pas celui-ci
        return false;
      }
    }
  }
  
  calculerRatioPositif(): number {
    const total = this.tradesPositifs + this.tradesNegatifs;
    if (total === 0) return 1.0; // Par défaut au début
    return this.tradesPositifs / total;
  }
  
  ajusterSeuils(): void {
    // Variation légère des seuils pour éviter des patterns
    this.seuilPositifMin = 0.72 + (Math.random() * 0.06); // 72-78%
    this.seuilPositifMax = 0.78 + (Math.random() * 0.06); // 78-84%
  }
  
  ngOnDestroy(): void {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
    
    if (this.tradeSimulationSubscription) {
      this.tradeSimulationSubscription.unsubscribe();
    }
  }

  toggleFullscreen(){

  }

  resetZoom(){

  }
}
